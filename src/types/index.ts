// ユーザー関連
export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  role: UserRole;
}

export interface UsersData {
  users: User[];
}

// 質問フロー関連
export interface Question {
  id: string;
  question: string;
  description: string;
}

export interface Settings {
  questionFlow: Question[];
}

// チャット関連
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  userId: string;
  userName: string;
  date: string;
  messages: ChatMessage[];
  status: 'in_progress' | 'completed';
  createdAt: string;
  completedAt?: string;
}

// 日報関連
export interface DailyReport {
  id: string;
  conversationId: string;
  userId: string;
  userName: string;
  date: string;
  content: string; // Markdown形式
  tasks: string[];
  achievements: string[];
  issues: string[];
  tomorrowPlan: string[];
  suggestions: string[];
  recommendations?: Recommendation[];
  createdAt: string;
}

export type RecommendationSource = 'youtube' | 'article' | 'book' | 'search';

export interface Recommendation {
  id: string;
  title: string;
  url: string;
  source: RecommendationSource;
  description?: string;
  reason?: string;
}

// 課題関連
export type IssueCategory =
  | 'personnel'      // 人員
  | 'process'        // プロセス
  | 'tools'          // ツール
  | 'communication'  // コミュニケーション
  | 'workload'       // 業務量
  | 'skills'         // スキル
  | 'other';         // その他

export interface Issue {
  id: string;
  conversationId: string;
  userId: string;
  userName: string;
  date: string;
  content: string;
  category: IssueCategory;
  severity: 'low' | 'medium' | 'high';
  createdAt: string;
}

export interface IssuesData {
  issues: Issue[];
}

// API レスポンス
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
