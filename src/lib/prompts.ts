import { ChatMessage, IssueCategory } from '@/types';

export function getCoachingSystemPrompt(userName: string, previousSessions?: string[]): string {
  const previousContext = previousSessions && previousSessions.length > 0
    ? `\n\n【過去のセッション情報】\n${previousSessions.slice(-3).join('\n')}`
    : '';

  return `あなたは経験豊富なプロフェッショナルコーチです。
${userName}さんとの1on1コーチングセッションを行います。

【あなたのコーチングスタイル】
- 傾聴を重視し、相手の言葉を丁寧に受け止めます
- 答えを与えるのではなく、質問を通じて相手が自ら気づきを得られるよう導きます
- 相手の強みや可能性に焦点を当て、ポジティブな視点を提供します
- 共感と承認を示しながら、適切なタイミングで深掘りの質問をします
- GROWモデル（Goal, Reality, Options, Will）を意識した対話を心がけます

【セッションの目的】
1. **今日の振り返り**: 今日一日どうだったか、何があったかを丁寧に聴きます
2. **成功体験の発見**: うまくいったこと、成長を感じた点を引き出します
3. **課題の明確化**: モヤモヤしていること、困っていることを言語化する手助けをします
4. **改善点の発見**: 明日からできる小さな改善や行動を一緒に考えます
5. **継続的な成長**: 毎日続けることで積み重なる改善を明確にします

【コーチングの進め方】
- 最初は「今日はどうでしたか？」のようなオープンな質問から始めてください
- 相手の回答に対して、「具体的には？」「それはなぜ？」「どう感じましたか？」などの深掘り質問をしてください
- 一度に多くの質問をせず、相手のペースに合わせて対話を進めてください
- 相手が話したいことを優先し、固定のフローに縛られないでください
- 良い点は具体的に認め、課題には一緒に向き合う姿勢を見せてください
- セッションの終わりには、今日の気づきと明日への一歩をまとめてください

【重要な注意点】
- 業務報告を聞くだけでなく、その人の感情や思考に寄り添ってください
- 「どうすればいい？」と聞かれても、すぐに答えを与えず、「あなたはどうしたいですか？」と問いかけてください
- 沈黙や考える時間を大切にし、急かさないでください
- 日本語で対話してください
- 温かく、安心感のある対話を心がけてください
${previousContext}

それでは、${userName}さんとのセッションを始めましょう。まず挨拶から始めてください。`;
}

export function getReportGenerationPrompt(messages: ChatMessage[], userName: string): string {
  const conversation = messages
    .filter((m) => m.role !== 'system')
    .map((m) => `${m.role === 'user' ? userName : 'コーチ'}: ${m.content}`)
    .join('\n');

  return `以下の1on1コーチングセッションの内容から、振り返りレポートを作成してください。

セッション内容:
${conversation}

以下のMarkdown形式でレポートを作成してください：

# コーチングレポート - ${userName} - ${new Date().toLocaleDateString('ja-JP')}

## 今日の振り返り
- （本人が語った1日の様子や感想を要約）

## うまくいったこと・成功体験
- （本人が感じた成功や良かった点）

## 課題・モヤモヤしていること
- （困っていること、考え中のこと）

## 気づき・学び
- （セッションを通じて得られた気づき）

## 明日からのアクション
- （具体的に取り組むこと、小さな一歩）

## コーチからのコメント
- （セッションで感じた本人の強みや可能性についてのポジティブなコメント）

---
*このレポートは1on1コーチングセッションからAIが自動生成しました。*`;
}

export function getIssueExtractionPrompt(messages: ChatMessage[], userName: string): string {
  const conversation = messages
    .filter((m) => m.role !== 'system')
    .map((m) => `${m.role === 'user' ? userName : 'コーチ'}: ${m.content}`)
    .join('\n');

  const categories: IssueCategory[] = [
    'personnel',
    'process',
    'tools',
    'communication',
    'workload',
    'skills',
    'other',
  ];

  return `以下の1on1の会話内容から、組織の課題を抽出してください。

会話内容:
${conversation}

抽出した課題を以下のJSON形式で返してください。課題がない場合は空の配列を返してください：

{
  "issues": [
    {
      "content": "課題の内容（具体的に）",
      "category": "${categories.join('" | "')}",
      "severity": "low | medium | high"
    }
  ]
}

カテゴリの説明：
- personnel: 人員不足、採用、チーム構成
- process: 業務プロセス、ワークフロー
- tools: ツール、システム、設備
- communication: コミュニケーション、情報共有
- workload: 業務量、残業、負荷
- skills: スキル、研修、成長
- other: その他`;
}

export function getRecommendationQueryPrompt(
  reportContent: string,
  issues: Array<{ content: string; category?: string; severity?: string }>
): string {
  const issuesText = issues.length > 0
    ? issues.map((i) => {
        const category = i.category || '未分類';
        const severity = i.severity || 'medium';
        return `- ${i.content} (${category}, 重要度: ${severity})`;
      }).join('\n')
    : 'なし';

  return `以下の日報内容と課題を詳細に分析し、**課題解決に最も効果的でクリティカルなリソース**を検索するための最適な検索クエリを**必ず5つ**生成してください。

【日報内容】
${reportContent.slice(0, 1500)}

【抽出された課題】
${issuesText}

以下のJSON形式で、**必ず5つの検索クエリ**を返してください。各クエリは課題の核心を捉え、具体的な解決策や深い洞察が得られるようなものにしてください：

{
  "queries": [
    "検索クエリ1（YouTube動画検索用 - 実践的な解決方法や事例）",
    "検索クエリ2（ウェブ記事検索用 - 最新のベストプラクティスやノウハウ）",
    "検索クエリ3（書籍検索用 - 体系的で深い知識や理論）",
    "検索クエリ4（YouTube動画/記事/書籍いずれか - 別の角度からのアプローチ）",
    "検索クエリ5（YouTube動画/記事/書籍いずれか - 具体的な事例やケーススタディ）"
  ],
  "focus": "この日報の主な焦点・テーマと最も重要な課題（1-2文で）"
}

**重要**: 必ず5つのクエリを返してください。3つや4つではなく、必ず5つです。

検索クエリの作成方針：
- **課題の核心を正確に捉えた具体的なキーワード**を含める
- **クリティカルな課題解決**に直結する解決方法やベストプラクティスを探すクエリにする
- 日本語で記述する
- 各クエリは異なる角度からアプローチする（実践、理論、事例、別の視点など）
- 重要度が高い課題を優先的に考慮する
- 表面的な情報ではなく、深い洞察や具体的な行動につながるリソースが見つかるクエリにする
- YouTube、記事、書籍の各ソースからバランス良く検索できるようにクエリを多様化する`;
}

export function getRecommendationEvaluationPrompt(
  reportContent: string,
  issues: Array<{ content: string }>,
  candidates: Array<{ title: string; description?: string; url: string; source: string }>
): string {
  const issuesText = issues.length > 0
    ? issues.map((i) => `- ${i.content}`).join('\n')
    : 'なし';

  const candidatesText = candidates.map((c, idx) => 
    `${idx + 1}. [${c.source}] ${c.title}\n   ${c.description || '説明なし'}\n   ${c.url}`
  ).join('\n\n');

  return `以下の日報内容と課題を詳細に分析し、提示されたリソース候補から**課題解決に最もクリティカルで効果的な必ず5つ**を厳選してください。

【日報内容】
${reportContent.slice(0, 1500)}

【課題】
${issuesText}

【リソース候補】
${candidatesText}

以下のJSON形式で、**必ず5つのリソース**を返してください。ソースのバランスを考慮し、YouTube、記事、書籍からバランス良く選んでください：

{
  "selected": [
    {
      "index": 候補の番号（1始まり）,
      "reason": "なぜこのリソースが選ばれたか、課題解決にどう役立つか（2-3文で具体的に、どの課題にどう対応するか明確に）"
    },
    {
      "index": 候補の番号（1始まり）,
      "reason": "なぜこのリソースが選ばれたか、課題解決にどう役立つか（2-3文で具体的に、どの課題にどう対応するか明確に）"
    },
    {
      "index": 候補の番号（1始まり）,
      "reason": "なぜこのリソースが選ばれたか、課題解決にどう役立つか（2-3文で具体的に、どの課題にどう対応するか明確に）"
    },
    {
      "index": 候補の番号（1始まり）,
      "reason": "なぜこのリソースが選ばれたか、課題解決にどう役立つか（2-3文で具体的に、どの課題にどう対応するか明確に）"
    },
    {
      "index": 候補の番号（1始まり）,
      "reason": "なぜこのリソースが選ばれたか、課題解決にどう役立つか（2-3文で具体的に、どの課題にどう対応するか明確に）"
    }
  ]
}

**重要**: 必ず5つのリソースを選んでください。3つや4つではなく、必ず5つです。候補が5つ未満の場合でも、可能な限り5つに近づけるように選んでください。

選定基準（優先順位順）：
1. **課題解決への直接的な関連性**: 日報の課題に対して最もクリティカルで効果的な解決策を提供できる
2. **実践性と具体性**: 抽象的な理論ではなく、具体的な行動や実践方法が得られる
3. **深い洞察**: 表面的な情報ではなく、根本的な理解や新しい視点を提供する
4. **信頼性**: 信頼できるソース（YouTube、記事、書籍）からの情報
5. **多様性**: ソースのバランス（YouTube、記事、書籍からバランス良く選ぶ）
6. **即効性**: すぐに活用できる、明日から実践できる内容

重要：5つのリソースは、異なる角度から課題解決をサポートするように選んでください。同じような内容のリソースを重複して選ばないでください。
- 多様性（同じタイプのリソースばかりにならない）
- YouTube、記事、書籍からバランス良く選ぶ（例：YouTube 2件、記事 2件、書籍 1件など）`;
}
