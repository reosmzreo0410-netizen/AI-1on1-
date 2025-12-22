import { cookies } from 'next/headers';
import { User } from '@/types';
import { getUserById } from './storage';

const USER_COOKIE_NAME = 'current_user_id';

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(USER_COOKIE_NAME)?.value;

  if (!userId) {
    return null;
  }

  const user = await getUserById(userId);
  return user || null;
}

export function isAdmin(user: User | null): boolean {
  return user?.role === 'admin';
}

export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('認証が必要です');
  }
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireAuth();
  if (!isAdmin(user)) {
    throw new Error('管理者権限が必要です');
  }
  return user;
}
