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
  // 課題がない場合は日報から課題を推測
  const issuesText = issues.length > 0
    ? issues.map((i) => {
        const category = i.category || '未分類';
        const severity = i.severity || 'medium';
        return `【課題${issues.indexOf(i) + 1}】${i.content}\n  カテゴリ: ${category}\n  重要度: ${severity}`;
      }).join('\n\n')
    : 'なし（日報内容から課題を推測してください）';

  // 重要度が高い課題を優先的に抽出
  const highPriorityIssues = issues
    .filter(i => i.severity === 'high' || i.severity === 'critical')
    .map(i => i.content);
  
  const mediumPriorityIssues = issues
    .filter(i => i.severity === 'medium' || !i.severity)
    .map(i => i.content);

  return `あなたは課題解決の専門家です。以下の日報内容と課題を**徹底的に分析**し、**各課題を直接的に解決できる具体的なリソース**を検索するための最適な検索クエリを**必ず5つ**生成してください。

【日報内容】
${reportContent.slice(0, 2000)}

【抽出された課題（優先順位順）】
${issuesText}

${highPriorityIssues.length > 0 ? `\n【最重要課題】\n${highPriorityIssues.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}` : ''}
${mediumPriorityIssues.length > 0 ? `\n【中優先度課題】\n${mediumPriorityIssues.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}` : ''}

**重要**: 各検索クエリは、上記の課題を**直接的に解決する**ための具体的なキーワードを含めてください。一般的な情報ではなく、課題の本質を捉えた解決策を探すクエリにしてください。

以下のJSON形式で、**必ず5つの検索クエリ**を返してください：

{
  "queries": [
    "検索クエリ1（YouTube動画検索用 - 課題1を直接解決する実践的な方法や事例）",
    "検索クエリ2（note記事/ウェブ記事検索用 - 課題2を直接解決する最新のノウハウやベストプラクティス）",
    "検索クエリ3（書籍検索用 - 課題3を体系的に解決する理論や知識）",
    "検索クエリ4（YouTube動画/note記事/ウェブ記事検索用 - 最重要課題を別の角度から解決するアプローチ）",
    "検索クエリ5（YouTube動画/note記事/ウェブ記事検索用 - 具体的な事例やケーススタディで課題解決を学ぶ）"
  ],
  "focus": "この日報の主な焦点・テーマと最も重要な課題（1-2文で）",
  "issueMapping": {
    "query1": "どの課題を解決するためのクエリか（課題の番号または内容）",
    "query2": "どの課題を解決するためのクエリか（課題の番号または内容）",
    "query3": "どの課題を解決するためのクエリか（課題の番号または内容）",
    "query4": "どの課題を解決するためのクエリか（課題の番号または内容）",
    "query5": "どの課題を解決するためのクエリか（課題の番号または内容）"
  }
}

**検索クエリの作成方針（必須）**：
1. **課題の核心を正確に捉える**: 各課題の本質的な問題点を理解し、それを解決するための具体的なキーワードを含める
2. **直接的な解決策を探す**: 「○○の解決方法」「○○の対処法」「○○を改善する方法」など、課題を直接解決するクエリにする
3. **重要度の高い課題を優先**: 重要度が「high」や「critical」の課題を優先的に解決するクエリを生成する
4. **具体的なキーワード**: 抽象的な言葉ではなく、課題の具体的な内容を含めたキーワードにする
5. **実践的な解決策**: 理論だけでなく、実際に行動できる具体的な方法を探すクエリにする
6. **日本語で記述**: すべて日本語で記述する
7. **多様なアプローチ**: 各クエリは異なる角度から課題解決をアプローチする（実践、理論、事例、別の視点など）
8. **note記事も含める**: note記事やウェブ記事を検索する際は、「note」や「note記事」というキーワードも含める

**悪い例**: 「営業 スキル」「コミュニケーション 向上」
**良い例**: 「営業で顧客の反応が悪い時の対処法」「チーム内のコミュニケーション不足を改善する実践方法」

必ず5つのクエリを返してください。`;
}

export function getRecommendationEvaluationPrompt(
  reportContent: string,
  issues: Array<{ content: string; category?: string; severity?: string }>,
  candidates: Array<{ title: string; description?: string; url: string; source: string }>
): string {
  // 課題を詳細に表示
  const issuesText = issues.length > 0
    ? issues.map((i, idx) => {
        const category = i.category || '未分類';
        const severity = i.severity || 'medium';
        return `【課題${idx + 1}】${i.content}\n  カテゴリ: ${category}\n  重要度: ${severity}`;
      }).join('\n\n')
    : 'なし（日報内容から課題を推測してください）';

  // 重要度の高い課題を強調
  const highPriorityIssues = issues
    .filter(i => i.severity === 'high' || i.severity === 'critical')
    .map(i => i.content);

  const candidatesText = candidates.map((c, idx) => 
    `${idx + 1}. [${c.source}] ${c.title}\n   説明: ${c.description || '説明なし'}\n   URL: ${c.url}`
  ).join('\n\n');

  return `あなたは課題解決の専門家です。以下の日報内容と課題を**徹底的に分析**し、提示されたリソース候補から**各課題を直接的に解決できる最も効果的な必ず5つ**を厳選してください。

【日報内容】
${reportContent.slice(0, 2000)}

【抽出された課題（詳細）】
${issuesText}

${highPriorityIssues.length > 0 ? `\n【最重要課題（優先的に解決すべき）】\n${highPriorityIssues.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}` : ''}

【リソース候補】
${candidatesText}

**重要**: 各リソースが**どの課題をどのように解決するか**を明確に判断してください。課題と無関係なリソースは選ばないでください。

以下のJSON形式で、**必ず5つのリソース**を返してください：

{
  "selected": [
    {
      "index": 候補の番号（1始まり）,
      "targetIssue": "このリソースが解決する課題の番号または内容",
      "reason": "なぜこのリソースが選ばれたか、どの課題をどのように解決するか（3-4文で具体的に、タイトルや説明から判断できる解決策の内容も含める）"
    },
    {
      "index": 候補の番号（1始まり）,
      "targetIssue": "このリソースが解決する課題の番号または内容",
      "reason": "なぜこのリソースが選ばれたか、どの課題をどのように解決するか（3-4文で具体的に、タイトルや説明から判断できる解決策の内容も含める）"
    },
    {
      "index": 候補の番号（1始まり）,
      "targetIssue": "このリソースが解決する課題の番号または内容",
      "reason": "なぜこのリソースが選ばれたか、どの課題をどのように解決するか（3-4文で具体的に、タイトルや説明から判断できる解決策の内容も含める）"
    },
    {
      "index": 候補の番号（1始まり）,
      "targetIssue": "このリソースが解決する課題の番号または内容",
      "reason": "なぜこのリソースが選ばれたか、どの課題をどのように解決するか（3-4文で具体的に、タイトルや説明から判断できる解決策の内容も含める）"
    },
    {
      "index": 候補の番号（1始まり）,
      "targetIssue": "このリソースが解決する課題の番号または内容",
      "reason": "なぜこのリソースが選ばれたか、どの課題をどのように解決するか（3-4文で具体的に、タイトルや説明から判断できる解決策の内容も含める）"
    }
  ]
}

**選定基準（優先順位順、すべて必須）**：
1. **課題との直接的な関連性（最重要）**: 
   - リソースのタイトルや説明が、提示された課題を**直接的に解決する**内容であること
   - 課題と無関係な一般的な情報は選ばない
   - 重要度が高い課題を優先的に解決するリソースを選ぶ

2. **具体的な解決策の提示**:
   - 抽象的な理論ではなく、具体的な行動や実践方法が明確に示されている
   - 「どうすればいいか」が分かる内容である

3. **実践性と即効性**:
   - すぐに活用できる、明日から実践できる内容
   - ケーススタディや事例が含まれている

4. **深い洞察**:
   - 表面的な情報ではなく、根本的な理解や新しい視点を提供する
   - 課題の本質を理解できる内容

5. **信頼性**:
   - 信頼できるソース（YouTube、note記事、ウェブ記事、書籍）からの情報

6. **多様性**:
   - ソースのバランス（YouTube、note記事、ウェブ記事、書籍からバランス良く選ぶ）
   - 異なる角度から課題解決をアプローチするリソースを選ぶ

**選定時の注意点**：
- 課題と無関係なリソースは絶対に選ばない
- 重要度が「high」や「critical」の課題を優先的に解決するリソースを選ぶ
- 同じ課題を解決するリソースを複数選ぶ場合は、異なるアプローチのものを選ぶ
- タイトルや説明から判断して、課題解決に役立つと確信できるもののみを選ぶ

必ず5つのリソースを選んでください。`;
}
