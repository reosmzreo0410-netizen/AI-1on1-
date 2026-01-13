import { Recommendation } from '@/types';

type IssueInput = { content: string } | string;

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;

// 簡易的にクエリを作成。OpenAIに依存せず、報告内容と課題をそのまま活用する。
function buildQueries(reportContent: string, issues: IssueInput[]): string[] {
  const issueTexts =
    issues
      .map((item) => (typeof item === 'string' ? item : item.content))
      .filter(Boolean)
      .slice(0, 3) || [];

  const condensedReport = reportContent.slice(0, 400);
  const base = condensedReport || issueTexts.join(' ');
  const queries: string[] = [];

  if (issueTexts.length > 0) {
    queries.push(issueTexts.join(' / '));
  }
  if (condensedReport) {
    queries.push(`${condensedReport} 改善のヒント`);
  }
  if (issueTexts.length > 0) {
    queries.push(`${issueTexts[0]} 解決事例`);
  }

  return Array.from(new Set(queries)).slice(0, 3);
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (error) {
    console.error('fetchJson error', error);
    return null;
  }
}

async function searchYouTube(query: string): Promise<Recommendation[]> {
  if (!YOUTUBE_API_KEY) return [];
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&q=${encodeURIComponent(
    query
  )}&key=${YOUTUBE_API_KEY}`;

  type YoutubeResponse = {
    items?: Array<{
      id?: { videoId?: string };
      snippet?: { title?: string; description?: string };
    }>;
  };

  const data = await fetchJson<YoutubeResponse>(url);
  if (!data?.items) return [];

  return data.items
    .map((item, idx) => {
      const videoId = item.id?.videoId;
      const title = item.snippet?.title || 'YouTube動画';
      if (!videoId) return null;
      return {
        id: `yt_${videoId}_${idx}`,
        title,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        source: 'youtube' as const,
        description: item.snippet?.description || undefined,
        reason: '課題に近い動画をYouTubeから取得しました。',
      };
    })
    .filter(Boolean) as Recommendation[];
}

async function searchWeb(query: string): Promise<Recommendation[]> {
  if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) return [];
  const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CSE_ID}&q=${encodeURIComponent(
    query
  )}`;

  type WebResponse = {
    items?: Array<{ title?: string; link?: string; snippet?: string }>;
  };

  const data = await fetchJson<WebResponse>(url);
  if (!data?.items) return [];

  return data.items.slice(0, 5).map((item, idx) => ({
    id: `web_${idx}`,
    title: item.title || '記事',
    url: item.link || '',
    source: 'article' as const,
    description: item.snippet,
    reason: '関連する記事をウェブ検索から取得しました。',
  }));
}

async function searchBooks(query: string): Promise<Recommendation[]> {
  if (!GOOGLE_API_KEY) return [];
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
    query
  )}&maxResults=5&key=${GOOGLE_API_KEY}`;

  type BookResponse = {
    items?: Array<{
      id?: string;
      volumeInfo?: { title?: string; infoLink?: string; description?: string };
    }>;
  };

  const data = await fetchJson<BookResponse>(url);
  if (!data?.items) return [];

  return data.items.slice(0, 5).map((item, idx) => ({
    id: `book_${item.id || idx}`,
    title: item.volumeInfo?.title || '書籍',
    url: item.volumeInfo?.infoLink || '',
    source: 'book' as const,
    description: item.volumeInfo?.description,
    reason: '課題に関連する書籍情報を取得しました。',
  }));
}

function fallbackRecommendations(queries: string[]): Recommendation[] {
  // APIキーがない場合でも検索画面に飛べるリンクを返す
  return queries.slice(0, 3).map((q, idx) => ({
    id: `search_${idx}`,
    title: `検索候補: ${q}`,
    url: `https://www.google.com/search?q=${encodeURIComponent(q)}`,
    source: 'search' as const,
    description: '関連情報を探すための検索リンクです。',
    reason: '外部APIキーが設定されていないため検索リンクを提示します。',
  }));
}

function dedupe(recs: Recommendation[]): Recommendation[] {
  const seen = new Set<string>();
  return recs.filter((r) => {
    if (!r.url) return false;
    const key = r.url;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function generateRecommendations(params: {
  reportContent: string;
  issues: IssueInput[];
}): Promise<Recommendation[]> {
  try {
    const queries = buildQueries(params.reportContent, params.issues);

    if (queries.length === 0) {
      return fallbackRecommendations(['日報 改善', '課題解決', 'スキルアップ']);
    }

    const results: Recommendation[] = [];

    // 各クエリに対して並列検索（タイムアウト対策）
    const searchPromises = queries.map(async (q) => {
      try {
        const [yt, web, books] = await Promise.allSettled([
          searchYouTube(q),
          searchWeb(q),
          searchBooks(q),
        ]);

        const ytResults = yt.status === 'fulfilled' ? yt.value : [];
        const webResults = web.status === 'fulfilled' ? web.value : [];
        const bookResults = books.status === 'fulfilled' ? books.value : [];

        return [...ytResults, ...webResults, ...bookResults];
      } catch (error) {
        console.error(`Search error for query "${q}":`, error);
        return [];
      }
    });

    const searchResults = await Promise.all(searchPromises);
    results.push(...searchResults.flat());

    const unique = dedupe(results);
    if (unique.length > 0) {
      return unique.slice(0, 3);
    }

    return fallbackRecommendations(queries);
  } catch (error) {
    console.error('Failed to generate recommendations:', error);
    // エラー時もフォールバックを返す
    return fallbackRecommendations([
      params.reportContent.slice(0, 50) || '日報 改善',
      '課題解決',
      'スキルアップ',
    ]);
  }
}
