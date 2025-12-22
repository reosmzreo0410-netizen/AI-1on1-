'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { User } from '@/types';

interface NavigationProps {
  user: User | null;
}

export default function Navigation({ user }: NavigationProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    router.push('/');
    router.refresh();
  };

  const isActive = (path: string) =>
    pathname === path ? 'bg-blue-700' : 'hover:bg-blue-600';

  if (!user) return null;

  return (
    <nav className="bg-blue-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-xl font-bold">
              AI 1on1
            </Link>

            <div className="flex space-x-2">
              <Link
                href="/chat"
                className={`px-4 py-2 rounded-md transition-colors ${isActive('/chat')}`}
              >
                1on1を始める
              </Link>
              <Link
                href="/reports"
                className={`px-4 py-2 rounded-md transition-colors ${isActive('/reports')}`}
              >
                日報一覧
              </Link>
              {user.role === 'admin' && (
                <>
                  <Link
                    href="/issues"
                    className={`px-4 py-2 rounded-md transition-colors ${isActive('/issues')}`}
                  >
                    課題ダッシュボード
                  </Link>
                  <Link
                    href="/settings"
                    className={`px-4 py-2 rounded-md transition-colors ${isActive('/settings')}`}
                  >
                    設定
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-sm">
              {user.name}
              {user.role === 'admin' && (
                <span className="ml-2 px-2 py-1 bg-yellow-500 text-xs rounded">
                  管理者
                </span>
              )}
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md transition-colors"
            >
              ログアウト
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
