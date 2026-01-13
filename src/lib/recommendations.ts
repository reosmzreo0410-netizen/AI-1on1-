import { Recommendation } from '@/types';
import OpenAI from 'openai';
import { getRecommendationQueryPrompt, getRecommendationEvaluationPrompt } from './prompts';

type IssueInput = { content: string; category?: string; severity?: string };

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

function getOpenAI(): OpenAI | null {
  if (!OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: OPENAI_API_KEY });
}

function getModel(): string {
  const model = process.env.OPENAI_MODEL;
  const validModels = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'];
  if (model && validModels.includes(model)) {
    return model;
  }
  return 'gpt-4o-mini';
}

// OpenAI APIを使って最適な検索クエリを生成
async function buildQueriesWithAI(
  reportContent: string,
  issues: Array<{ content: string; category?: string; severity?: string }>
): Promise<string[]> {
  const openai = getOpenAI();
  if (!openai) {
    return buildQueriesFallback(reportContent, issues);
  }

  try {
    const prompt = getRecommendationQueryPrompt(reportContent, issues);
    const response = await openai.chat.completions.create({
      model: getModel(),
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '';
    const parsed = JSON.parse(content);
    
    if (parsed.queries && Array.isArray(parsed.queries)) {
      return parsed.queries.slice(0, 5);
    }
  } catch (error: any) {
    // レート制限エラー（TPM/RPM）の場合はフォールバックを使用
    const errorMessage = error?.message || '';
    const isRateLimitError = 
      error?.status === 429 || 
      errorMessage.includes('Rate limit') ||
      errorMessage.includes('requests per min (RPM)') ||
      errorMessage.includes('tokens per min (TPM)');
    
    if (isRateLimitError) {
      const rateLimitType = errorMessage.includes('RPM') ? 'RPM' : 
                           errorMessage.includes('TPM') ? 'TPM' : 'Rate limit';
      console.warn(`OpenAI API ${rateLimitType} rate limit reached, using fallback queries`);
      return buildQueriesFallback(reportContent, issues);
    }
    console.error('Failed to generate queries with AI:', error);
  }

  return buildQueriesFallback(reportContent, issues);
}

// フォールバック: 課題から直接検索クエリを作成（AIを使わない）
function buildQueriesFallback(
  reportContent: string,
  issues: Array<{ content: string; category?: string; severity?: string }>
): string[] {
  const queries: string[] = [];
  
  // 重要度の高い課題を優先
  const highPriorityIssues = issues
    .filter(i => i.severity === 'high' || i.severity === 'critical')
    .map(i => i.content);
  
  const mediumPriorityIssues = issues
    .filter(i => i.severity === 'medium' || !i.severity)
    .map(i => i.content);
  
  const allIssues = [...highPriorityIssues, ...mediumPriorityIssues].slice(0, 5);

  // 課題から直接検索クエリを生成
  if (allIssues.length > 0) {
    allIssues.forEach((issue, idx) => {
      if (idx < 5) {
        // YouTube動画検索用
        if (idx === 0 || idx === 3) {
          queries.push(`${issue} 解決方法 実践`);
        }
        // note記事/ウェブ記事検索用
        if (idx === 1 || idx === 4) {
          queries.push(`${issue} 対処法 note記事`);
        }
        // 書籍検索用
        if (idx === 2) {
          queries.push(`${issue} 改善方法 書籍`);
        }
      }
    });
  }

  // 課題がない場合は日報から推測
  if (queries.length === 0 && reportContent) {
    const keywords = reportContent
      .slice(0, 200)
      .replace(/\n/g, ' ')
      .split(/[。、\s]+/)
      .filter(w => w.length > 3)
      .slice(0, 3);
    
    keywords.forEach((keyword, idx) => {
      if (idx === 0) queries.push(`${keyword} 解決方法`);
      if (idx === 1) queries.push(`${keyword} 改善方法 note記事`);
      if (idx === 2) queries.push(`${keyword} ベストプラクティス`);
    });
  }

  // 5つに満たない場合は汎用的なクエリを追加
  while (queries.length < 5) {
    const genericQueries = [
      '課題解決 実践方法',
      '問題解決 ベストプラクティス',
      'スキルアップ 方法',
      '改善方法 note記事',
      '課題解決 書籍'
    ];
    const genericQuery = genericQueries[queries.length % genericQueries.length];
    if (!queries.includes(genericQuery)) {
      queries.push(genericQuery);
    } else {
      break;
    }
  }

  return Array.from(new Set(queries)).slice(0, 5);
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
  
  const optimizedQuery = query + ' 日本語';
  
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10&q=${encodeURIComponent(
    optimizedQuery
  )}&key=${YOUTUBE_API_KEY}&relevanceLanguage=ja&regionCode=JP`;

  type YoutubeResponse = {
    items?: Array<{
      id?: { videoId?: string };
      snippet?: { 
        title?: string; 
        description?: string;
        channelTitle?: string;
        publishedAt?: string;
      };
    }>;
  };

  const data = await fetchJson<YoutubeResponse>(url);
  if (!data?.items) return [];

  return data.items
    .map((item, idx) => {
      const videoId = item.id?.videoId;
      const title = item.snippet?.title || 'YouTube動画';
      if (!videoId) return null;
      
      const description = item.snippet?.description 
        ? item.snippet.description.slice(0, 200) + '...'
        : undefined;
      
      return {
        id: `yt_${videoId}_${idx}`,
        title,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        source: 'youtube' as const,
        description,
        reason: '課題解決に役立つ動画をYouTubeから取得しました。',
      };
    })
    .filter(Boolean) as Recommendation[];
}

async function searchWeb(query: string): Promise<Recommendation[]> {
  if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) return [];
  
  // note記事も含めて検索（note.ioを含める）
  // 課題解決に焦点を当てたクエリに最適化
  const optimizedQuery = `${query} (解決方法 OR 対処法 OR 改善方法 OR ベストプラクティス) (site:note.com OR site:note.mu OR site:jp OR site:com)`;
  
  const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CSE_ID}&q=${encodeURIComponent(
    optimizedQuery
  )}&lr=lang_ja&num=10`;

  type WebResponse = {
    items?: Array<{ 
      title?: string; 
      link?: string; 
      snippet?: string;
      displayLink?: string;
    }>;
  };

  const data = await fetchJson<WebResponse>(url);
  if (!data?.items) return [];

  return data.items.map((item, idx) => {
    // note記事かどうかを判定
    const isNote = item.link?.includes('note.com') || item.link?.includes('note.mu');
    const displayLink = item.displayLink || '';
    
    return {
      id: `web_${idx}_${Date.now()}`,
      title: item.title || '記事',
      url: item.link || '',
      source: 'article' as const,
      description: item.snippet ? item.snippet.slice(0, 200) + '...' : undefined,
      reason: isNote 
        ? '課題解決に役立つnote記事を検索から取得しました。'
        : '課題解決に役立つウェブ記事を検索から取得しました。',
    };
  });
}

async function searchBooks(query: string): Promise<Recommendation[]> {
  if (!GOOGLE_API_KEY) return [];
  
  const optimizedQuery = query + ' language:ja';
  
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
    optimizedQuery
  )}&maxResults=10&key=${GOOGLE_API_KEY}&langRestrict=ja`;

  type BookResponse = {
    items?: Array<{
      id?: string;
      volumeInfo?: { 
        title?: string; 
        infoLink?: string; 
        description?: string;
        authors?: string[];
        publishedDate?: string;
      };
    }>;
  };

  const data = await fetchJson<BookResponse>(url);
  if (!data?.items) return [];

  return data.items.map((item, idx) => {
    const authors = item.volumeInfo?.authors 
      ? `著者: ${item.volumeInfo.authors.join(', ')}`
      : '';
    const description = item.volumeInfo?.description 
      ? item.volumeInfo.description.slice(0, 200) + '...'
      : undefined;
    
    return {
      id: `book_${item.id || idx}`,
      title: item.volumeInfo?.title || '書籍',
      url: item.volumeInfo?.infoLink || `https://books.google.com/books?id=${item.id}`,
      source: 'book' as const,
      description: description ? `${authors}\n${description}` : authors,
      reason: '課題解決に役立つ書籍を検索しました。',
    };
  });
}

function fallbackRecommendations(queries: string[]): Recommendation[] {
  return queries.slice(0, 5).map((q, idx) => ({
    id: `search_${idx}`,
    title: `🔍 ${q} を検索`,
    url: `https://www.google.com/search?q=${encodeURIComponent(q)}`,
    source: 'search' as const,
    description: 'このキーワードでGoogle検索を行い、関連するリソースを見つけることができます。',
    reason: '外部APIキー（YouTube/Google Custom Search/Google Books）が設定されていないため、検索リンクを提供しています。',
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

// ソースのバランスを考慮してリコメンドを選ぶ（YouTube、記事、書籍からバランス良く）
function balanceSources(recs: Recommendation[]): Recommendation[] {
  if (recs.length === 0) return [];
  
  const bySource = {
    youtube: recs.filter(r => r.source === 'youtube'),
    article: recs.filter(r => r.source === 'article'),
    book: recs.filter(r => r.source === 'book'),
    search: recs.filter(r => r.source === 'search'),
  };

  const result: Recommendation[] = [];
  const sources: Array<keyof typeof bySource> = ['youtube', 'article', 'book'];
  
  // 各ソースから順番に選ぶ（ラウンドロビン方式）
  let sourceIndex = 0;
  
  // まずは各ソースから均等に選ぶ（最大5件まで）
  while (result.length < 5 && (bySource.youtube.length > 0 || bySource.article.length > 0 || bySource.book.length > 0)) {
    let added = false;
    for (let i = 0; i < sources.length; i++) {
      const source = sources[(sourceIndex + i) % sources.length];
      const sourceRecs = bySource[source];
      
      if (sourceRecs.length > 0) {
        const rec = sourceRecs.shift()!;
        result.push(rec);
        added = true;
        break;
      }
    }
    
    if (!added) break;
    sourceIndex++;
  }

  // まだ5つに満たない場合は残りを追加（searchも含む）
  const remaining = [...bySource.youtube, ...bySource.article, ...bySource.book, ...bySource.search];
  while (result.length < 5 && remaining.length > 0) {
    result.push(remaining.shift()!);
  }

  // 確実に5件返す（不足している場合は最初の要素を繰り返し追加）
  if (result.length < 5 && recs.length > 0) {
    const resultUrls = new Set(result.map(r => r.url));
    const additional = recs
      .filter(r => !resultUrls.has(r.url))
      .slice(0, 5 - result.length);
    result.push(...additional);
  }

  return result.slice(0, 5); // 最大5件を返す
}

// AIを使って検索結果を評価し、最適な5つを選ぶ
async function evaluateAndSelectRecommendations(
  reportContent: string,
  issues: Array<{ content: string; category?: string; severity?: string }>,
  candidates: Recommendation[]
): Promise<Recommendation[]> {
  const openai = getOpenAI();
  if (!openai || candidates.length === 0) {
    const balanced = balanceSources(candidates);
    return balanced.slice(0, 5);
  }

  // 候補が5つ以下の場合はそのまま返す
  if (candidates.length <= 5) {
    return balanceSources(candidates);
  }

  try {
    const prompt = getRecommendationEvaluationPrompt(
      reportContent,
      issues,
      candidates.map(c => ({
        title: c.title,
        description: c.description,
        url: c.url,
        source: c.source,
      }))
    );

    const response = await openai.chat.completions.create({
      model: getModel(),
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '';
    const parsed = JSON.parse(content);
    
    if (parsed.selected && Array.isArray(parsed.selected)) {
      const selected = parsed.selected
        .map((s: { index: number; reason: string; targetIssue?: string }) => {
          const candidate = candidates[s.index - 1];
          if (!candidate) return null;
          // targetIssueが指定されている場合は、reasonに含める
          const reason = s.targetIssue 
            ? `【解決する課題】${s.targetIssue}\n${s.reason || candidate.reason}`
            : (s.reason || candidate.reason);
          return {
            ...candidate,
            reason,
          };
        })
        .filter(Boolean) as Recommendation[];
      
      // AIが選んだ結果が5件未満の場合は、残りを候補から追加
      let finalSelected = selected;
      if (selected.length < 5) {
        const selectedUrls = new Set(selected.map(s => s.url));
        const additional = candidates
          .filter(c => !selectedUrls.has(c.url))
          .slice(0, 5 - selected.length);
        finalSelected = [...selected, ...additional];
      }
      
      // ソースのバランスを考慮して5つ選ぶ
      const balanced = balanceSources(finalSelected.slice(0, 15));
      const result = balanced.slice(0, 5);
      
      // 確実に5件返す（不足している場合は候補から追加）
      if (result.length < 5) {
        const resultUrls = new Set(result.map(r => r.url));
        const remaining = candidates
          .filter(c => !resultUrls.has(c.url))
          .slice(0, 5 - result.length);
        return [...result, ...remaining].slice(0, 5);
      }
      
      return result;
    }
  } catch (error: any) {
    // レート制限エラー（TPM/RPM）の場合はフォールバックを使用
    const errorMessage = error?.message || '';
    const isRateLimitError = 
      error?.status === 429 || 
      errorMessage.includes('Rate limit') ||
      errorMessage.includes('requests per min (RPM)') ||
      errorMessage.includes('tokens per min (TPM)');
    
    if (isRateLimitError) {
      const rateLimitType = errorMessage.includes('RPM') ? 'RPM' : 
                           errorMessage.includes('TPM') ? 'TPM' : 'Rate limit';
      console.warn(`OpenAI API ${rateLimitType} rate limit reached, using fallback selection`);
      // 課題に関連するキーワードでフィルタリング
      return selectRecommendationsByKeywords(issues, candidates);
    }
    console.error('Failed to evaluate recommendations:', error);
  }

  // エラー時は課題に関連するキーワードでフィルタリング
  return selectRecommendationsByKeywords(issues, candidates);
}

// 課題のキーワードを使ってリソースを選ぶ（AIを使わない）
function selectRecommendationsByKeywords(
  issues: Array<{ content: string; category?: string; severity?: string }>,
  candidates: Recommendation[]
): Recommendation[] {
  if (candidates.length === 0) return [];
  
  // 課題からキーワードを抽出
  const keywords = issues
    .map(i => i.content)
    .filter(Boolean)
    .flatMap(content => {
      // 課題の内容から重要な単語を抽出（3文字以上）
      return content
        .split(/[。、\s]+/)
        .filter(w => w.length >= 3)
        .slice(0, 5);
    });

  // キーワードに関連するリソースを優先的に選ぶ
  const scored = candidates.map(candidate => {
    let score = 0;
    const text = `${candidate.title} ${candidate.description || ''}`.toLowerCase();
    
    keywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase();
      if (text.includes(keywordLower)) {
        score += 10; // タイトルや説明に含まれている場合は高スコア
      }
    });
    
    // 重要度が高い課題に関連する場合は追加スコア
    issues.forEach(issue => {
      if (issue.severity === 'high' || issue.severity === 'critical') {
        const issueLower = issue.content.toLowerCase();
        if (text.includes(issueLower)) {
          score += 5;
        }
      }
    });
    
    return { candidate, score };
  });

  // スコア順にソート
  scored.sort((a, b) => b.score - a.score);
  
  // 上位の候補を取得
  const topCandidates = scored
    .slice(0, 15)
    .map(s => s.candidate);
  
  // ソースのバランスを考慮して5つ選ぶ
  const balanced = balanceSources(topCandidates);
  return balanced.slice(0, 5);
}

export async function generateRecommendations(params: {
  reportContent: string;
  issues: IssueInput[];
}): Promise<Recommendation[]> {
  try {
    // 課題を正規化
    const normalizedIssues = params.issues.map((item) => {
      return {
        content: item.content,
        category: item.category,
        severity: item.severity,
      };
    });

    // AIを使って最適な検索クエリを生成
    const queries = await buildQueriesWithAI(params.reportContent, normalizedIssues);

    if (queries.length === 0) {
      return fallbackRecommendations(['日報 改善', '課題解決', 'スキルアップ', 'ベストプラクティス', '実践方法']);
    }

    const allResults: Recommendation[] = [];

    // 各クエリに対して並列検索
    const searchPromises = queries.map(async (q) => {
      try {
        const promises: Promise<Recommendation[]>[] = [];
        
        // すべてのソースから検索
        if (YOUTUBE_API_KEY) promises.push(searchYouTube(q));
        if (GOOGLE_API_KEY && GOOGLE_CSE_ID) promises.push(searchWeb(q));
        if (GOOGLE_API_KEY) promises.push(searchBooks(q));

        const results = await Promise.allSettled(promises);
        const fulfilled = results
          .filter((r) => r.status === 'fulfilled')
          .map((r) => (r as PromiseFulfilledResult<Recommendation[]>).value)
          .flat();
        
        return fulfilled;
      } catch (error) {
        console.error(`Search error for query "${q}":`, error);
        return [];
      }
    });

    const searchResults = await Promise.all(searchPromises);
    allResults.push(...searchResults.flat());

    // 重複を除去
    const unique = dedupe(allResults);

    if (unique.length === 0) {
      return fallbackRecommendations(queries);
    }

    // AIで評価して最適な5つを選ぶ
    const selected = await evaluateAndSelectRecommendations(
      params.reportContent,
      normalizedIssues,
      unique
    );

    // ソースのバランスを考慮して最終的に5つを返す
    const balanced = balanceSources(selected.length > 0 ? selected : unique);
    let result = balanced.slice(0, 5);
    
    // 確実に5件返す（不足している場合は候補から追加）
    if (result.length < 5 && unique.length > result.length) {
      const resultUrls = new Set(result.map(r => r.url));
      const remaining = unique
        .filter(c => !resultUrls.has(c.url))
        .slice(0, 5 - result.length);
      result = [...result, ...remaining].slice(0, 5);
    }
    
    // 最終確認：5件未満の場合はフォールバックを追加
    if (result.length < 5) {
      const fallback = fallbackRecommendations(queries);
      const resultUrls = new Set(result.map(r => r.url));
      const additionalFallback = fallback
        .filter(f => !resultUrls.has(f.url))
        .slice(0, 5 - result.length);
      result = [...result, ...additionalFallback].slice(0, 5);
    }
    
    return result;
  } catch (error) {
    console.error('Failed to generate recommendations:', error);
    // エラー時もフォールバックを返す
    const fallbackQueries = [
      params.reportContent.slice(0, 50) || '日報 改善',
      '課題解決',
      'スキルアップ',
      'ベストプラクティス',
      '実践方法',
    ];
    return fallbackRecommendations(fallbackQueries);
  }
}
