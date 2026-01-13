import { kv } from '@vercel/kv';
import {
  User,
  UsersData,
  Settings,
  Conversation,
  DailyReport,
  Issue,
  IssuesData,
} from '@/types';

// 初期データ（Vercel KVが空の場合に使用）
const defaultUsers: User[] = [
  { id: 'admin', name: '管理者', role: 'admin' },
  { id: 'user1', name: 'テストユーザー', role: 'user' },
];

const defaultSettings: Settings = {
  questionFlow: [
    {
      id: '1',
      question: '今日の業務で達成したことを教えてください',
      description: '具体的な成果や完了したタスクについて',
    },
    {
      id: '2',
      question: '困っていることや課題はありますか？',
      description: '業務上の障害や改善が必要な点について',
    },
    {
      id: '3',
      question: '明日の予定や目標を教えてください',
      description: '翌日に取り組む予定のタスクについて',
    },
  ],
};

// KV Keys
const KEYS = {
  USERS: 'users',
  SETTINGS: 'settings',
  CONVERSATIONS: 'conversations',
  REPORTS: 'reports',
  ISSUES: 'issues',
};

// ユーザー関連
export async function getUsers(): Promise<User[]> {
  try {
    const data = await kv.get<UsersData>(KEYS.USERS);
    if (!data) {
      // 初期データを設定
      await saveUsers(defaultUsers);
      return defaultUsers;
    }
    return data.users;
  } catch (error) {
    console.error('Error getting users:', error);
    return defaultUsers;
  }
}

export async function getUserById(id: string): Promise<User | undefined> {
  const users = await getUsers();
  return users.find((u) => u.id === id);
}

export async function saveUsers(users: User[]): Promise<void> {
  const data: UsersData = { users };
  await kv.set(KEYS.USERS, data);
}

// 設定関連
export async function getSettings(): Promise<Settings> {
  try {
    const data = await kv.get<Settings>(KEYS.SETTINGS);
    if (!data) {
      await saveSettings(defaultSettings);
      return defaultSettings;
    }
    return data;
  } catch (error) {
    console.error('Error getting settings:', error);
    return defaultSettings;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await kv.set(KEYS.SETTINGS, settings);
}

// 会話関連
export async function saveConversation(conversation: Conversation): Promise<void> {
  // 個別の会話を保存
  await kv.set(`conversation:${conversation.id}`, conversation);
  
  // 会話IDリストを更新
  const ids = await kv.get<string[]>(KEYS.CONVERSATIONS) || [];
  if (!ids.includes(conversation.id)) {
    ids.push(conversation.id);
    await kv.set(KEYS.CONVERSATIONS, ids);
  }
}

export async function getConversation(id: string): Promise<Conversation | null> {
  try {
    return await kv.get<Conversation>(`conversation:${id}`);
  } catch {
    return null;
  }
}

export async function getConversationsByUser(userId: string): Promise<Conversation[]> {
  const ids = await kv.get<string[]>(KEYS.CONVERSATIONS) || [];
  const conversations: Conversation[] = [];

  for (const id of ids) {
    const conv = await kv.get<Conversation>(`conversation:${id}`);
    if (conv && conv.userId === userId) {
      conversations.push(conv);
    }
  }

  return conversations.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getAllConversations(): Promise<Conversation[]> {
  const ids = await kv.get<string[]>(KEYS.CONVERSATIONS) || [];
  const conversations: Conversation[] = [];

  for (const id of ids) {
    const conv = await kv.get<Conversation>(`conversation:${id}`);
    if (conv) {
      conversations.push(conv);
    }
  }

  return conversations.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// 日報関連
export async function saveReport(report: DailyReport): Promise<void> {
  await kv.set(`report:${report.id}`, report);
  
  const ids = await kv.get<string[]>(KEYS.REPORTS) || [];
  if (!ids.includes(report.id)) {
    ids.push(report.id);
    await kv.set(KEYS.REPORTS, ids);
  }
}

export async function getReport(id: string): Promise<DailyReport | null> {
  try {
    return await kv.get<DailyReport>(`report:${id}`);
  } catch {
    return null;
  }
}

export async function getReportsByUser(userId: string): Promise<DailyReport[]> {
  const ids = await kv.get<string[]>(KEYS.REPORTS) || [];
  const reports: DailyReport[] = [];

  for (const id of ids) {
    const report = await kv.get<DailyReport>(`report:${id}`);
    if (report && report.userId === userId) {
      reports.push(report);
    }
  }

  return reports.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export async function getAllReports(): Promise<DailyReport[]> {
  const ids = await kv.get<string[]>(KEYS.REPORTS) || [];
  const reports: DailyReport[] = [];

  for (const id of ids) {
    const report = await kv.get<DailyReport>(`report:${id}`);
    if (report) {
      reports.push(report);
    }
  }

  return reports.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

// 課題関連
export async function getIssues(): Promise<Issue[]> {
  try {
    const data = await kv.get<IssuesData>(KEYS.ISSUES);
    return data?.issues || [];
  } catch {
    return [];
  }
}

export async function saveIssue(issue: Issue): Promise<void> {
  const issues = await getIssues();
  issues.push(issue);
  const data: IssuesData = { issues };
  await kv.set(KEYS.ISSUES, data);
}

export async function saveIssues(issues: Issue[]): Promise<void> {
  const data: IssuesData = { issues };
  await kv.set(KEYS.ISSUES, data);
}
