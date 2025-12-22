import { promises as fs } from 'fs';
import path from 'path';
import {
  User,
  UsersData,
  Settings,
  Conversation,
  DailyReport,
  Issue,
  IssuesData,
} from '@/types';

const DATA_DIR = path.join(process.cwd(), 'data');

// ユーザー関連
export async function getUsers(): Promise<User[]> {
  const data = await fs.readFile(path.join(DATA_DIR, 'users.json'), 'utf-8');
  const parsed: UsersData = JSON.parse(data);
  return parsed.users;
}

export async function getUserById(id: string): Promise<User | undefined> {
  const users = await getUsers();
  return users.find((u) => u.id === id);
}

export async function saveUsers(users: User[]): Promise<void> {
  const data: UsersData = { users };
  await fs.writeFile(
    path.join(DATA_DIR, 'users.json'),
    JSON.stringify(data, null, 2)
  );
}

// 設定関連
export async function getSettings(): Promise<Settings> {
  const data = await fs.readFile(path.join(DATA_DIR, 'settings.json'), 'utf-8');
  return JSON.parse(data);
}

export async function saveSettings(settings: Settings): Promise<void> {
  await fs.writeFile(
    path.join(DATA_DIR, 'settings.json'),
    JSON.stringify(settings, null, 2)
  );
}

// 会話関連
export async function saveConversation(conversation: Conversation): Promise<void> {
  const filePath = path.join(
    DATA_DIR,
    'conversations',
    `${conversation.id}.json`
  );
  await fs.writeFile(filePath, JSON.stringify(conversation, null, 2));
}

export async function getConversation(id: string): Promise<Conversation | null> {
  try {
    const filePath = path.join(DATA_DIR, 'conversations', `${id}.json`);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function getConversationsByUser(userId: string): Promise<Conversation[]> {
  const dir = path.join(DATA_DIR, 'conversations');
  const files = await fs.readdir(dir);
  const conversations: Conversation[] = [];

  for (const file of files) {
    if (file.endsWith('.json')) {
      const data = await fs.readFile(path.join(dir, file), 'utf-8');
      const conv: Conversation = JSON.parse(data);
      if (conv.userId === userId) {
        conversations.push(conv);
      }
    }
  }

  return conversations.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getAllConversations(): Promise<Conversation[]> {
  const dir = path.join(DATA_DIR, 'conversations');
  const files = await fs.readdir(dir);
  const conversations: Conversation[] = [];

  for (const file of files) {
    if (file.endsWith('.json')) {
      const data = await fs.readFile(path.join(dir, file), 'utf-8');
      conversations.push(JSON.parse(data));
    }
  }

  return conversations.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// 日報関連
export async function saveReport(report: DailyReport): Promise<void> {
  const filePath = path.join(DATA_DIR, 'reports', `${report.id}.md`);
  await fs.writeFile(filePath, report.content);

  // メタデータも保存
  const metaPath = path.join(DATA_DIR, 'reports', `${report.id}.json`);
  await fs.writeFile(metaPath, JSON.stringify(report, null, 2));
}

export async function getReport(id: string): Promise<DailyReport | null> {
  try {
    const metaPath = path.join(DATA_DIR, 'reports', `${id}.json`);
    const data = await fs.readFile(metaPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function getReportsByUser(userId: string): Promise<DailyReport[]> {
  const dir = path.join(DATA_DIR, 'reports');
  const files = await fs.readdir(dir);
  const reports: DailyReport[] = [];

  for (const file of files) {
    if (file.endsWith('.json')) {
      const data = await fs.readFile(path.join(dir, file), 'utf-8');
      const report: DailyReport = JSON.parse(data);
      if (report.userId === userId) {
        reports.push(report);
      }
    }
  }

  return reports.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export async function getAllReports(): Promise<DailyReport[]> {
  const dir = path.join(DATA_DIR, 'reports');
  const files = await fs.readdir(dir);
  const reports: DailyReport[] = [];

  for (const file of files) {
    if (file.endsWith('.json')) {
      const data = await fs.readFile(path.join(dir, file), 'utf-8');
      reports.push(JSON.parse(data));
    }
  }

  return reports.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

// 課題関連
export async function getIssues(): Promise<Issue[]> {
  try {
    const data = await fs.readFile(
      path.join(DATA_DIR, 'issues', 'issues.json'),
      'utf-8'
    );
    const parsed: IssuesData = JSON.parse(data);
    return parsed.issues;
  } catch {
    return [];
  }
}

export async function saveIssue(issue: Issue): Promise<void> {
  const issues = await getIssues();
  issues.push(issue);
  const data: IssuesData = { issues };
  await fs.writeFile(
    path.join(DATA_DIR, 'issues', 'issues.json'),
    JSON.stringify(data, null, 2)
  );
}

export async function saveIssues(issues: Issue[]): Promise<void> {
  const data: IssuesData = { issues };
  await fs.writeFile(
    path.join(DATA_DIR, 'issues', 'issues.json'),
    JSON.stringify(data, null, 2)
  );
}
