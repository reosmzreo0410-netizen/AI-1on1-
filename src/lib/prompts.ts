import { Question, ChatMessage, IssueCategory } from '@/types';

export function getSystemPrompt(questions: Question[]): string {
  const questionList = questions
    .map((q, i) => `${i + 1}. ${q.question}`)
    .join('\n');

  return `あなたは1on1ミーティングのファシリテーターAIです。
チームメンバーと毎日の1on1を行い、業務内容や課題をヒアリングします。

以下の質問を順番に行ってください：
${questionList}

重要なガイドライン：
- 各質問に対する回答を待ってから次の質問に進んでください
- 回答に対して共感を示し、必要に応じて追加で質問してください
- 困りごとや課題については詳しく掘り下げてください
- 励ましや前向きなコメントを含めてください
- 全ての質問が終わったら「本日の1on1はこれで終了です」と伝えてください
- 日本語で対話してください`;
}

export function getReportGenerationPrompt(messages: ChatMessage[], userName: string): string {
  const conversation = messages
    .filter((m) => m.role !== 'system')
    .map((m) => `${m.role === 'user' ? userName : 'AI'}: ${m.content}`)
    .join('\n');

  return `以下の1on1の会話内容から、日報を作成してください。

会話内容:
${conversation}

以下のMarkdown形式で日報を作成してください：

# 日報 - ${userName} - ${new Date().toLocaleDateString('ja-JP')}

## 本日の業務内容
- （会話から抽出した業務内容を箇条書き）

## 成果・進捗
- （うまくいったこと、達成したこと）

## 課題・困りごと
- （困っていること、問題点）

## 明日の予定
- （明日やることの予定）

## 組織への提案・要望
- （チームや組織への改善提案）

## その他メモ
- （その他の重要な情報）

---
*この日報は1on1の会話内容からAIが自動生成しました。*`;
}

export function getIssueExtractionPrompt(messages: ChatMessage[], userName: string): string {
  const conversation = messages
    .filter((m) => m.role !== 'system')
    .map((m) => `${m.role === 'user' ? userName : 'AI'}: ${m.content}`)
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
