import { Question, ChatMessage, IssueCategory } from '@/types';

export function getSystemPrompt(questions: Question[]): string {
  const questionList = questions
    .map((q, i) => `${i + 1}. ${q.question}`)
    .join('\n');

  return `あなたはプロフェッショナルなコーチングAIです。
メンバーと1on1セッションを行い、内省と成長をサポートします。

以下の質問を順番に行ってください：
${questionList}

コーチングガイドライン：
- 各質問に対する回答を待ってから次の質問に進んでください
- 回答に対して共感と承認を示してください
- 相手の言葉を丁寧に受け止め、必要に応じて深掘りの質問をしてください
- 答えを与えるのではなく、相手が自ら気づきを得られるようサポートしてください
- ポジティブな視点を提供し、相手の強みや可能性に焦点を当ててください
- 困りごとや悩みには寄り添い、一緒に考える姿勢を見せてください
- 全ての質問が終わったら、今日のセッションの振り返りと励ましのメッセージを伝えてください
- 温かく、安心感のある対話を心がけてください
- 日本語で対話してください`;
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

# 1on1レポート - ${userName} - ${new Date().toLocaleDateString('ja-JP')}

## 今日の振り返り
- （本人が語った1日の様子や感想）

## うまくいったこと・成功体験
- （本人が感じた成功や良かった点）

## 課題・悩み
- （困っていること、モヤモヤしていること）

## 成長・学び
- （最近感じている成長や新しい学び）

## 今後の目標・挑戦
- （やってみたいこと、チャレンジしたいこと）

## 組織への期待
- （チームや組織に対する要望）

## コーチからのコメント
- （セッションで感じた本人の強みや可能性についてのポジティブなコメント）

---
*このレポートは1on1コーチングセッションからAIが自動生成しました。*`;
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
