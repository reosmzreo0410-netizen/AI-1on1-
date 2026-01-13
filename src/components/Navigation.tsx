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
    pathname === path
      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md'
      : 'hover:bg-white/10';

  if (!user) return null;

  return (
    <nav className="bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-xl">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-6">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              AIコーチング
            </Link>

            <div className="flex space-x-1">
              <Link
                href="/chat"
                className={`px-4 py-2 rounded-lg transition-all ${isActive('/chat')}`}
              >
                コーチング
              </Link>
              <Link
                href="/reports"
                className={`px-4 py-2 rounded-lg transition-all ${isActive('/reports')}`}
              >
                レポート
              </Link>
              {user.role === 'admin' && (
                <>
                  <Link
                    href="/issues"
                    className={`px-4 py-2 rounded-lg transition-all ${isActive('/issues')}`}
                  >
                    課題
                  </Link>
                  <Link
                    href="/settings"
                    className={`px-4 py-2 rounded-lg transition-all ${isActive('/settings')}`}
                  >
                    メンバー
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-sm font-medium">
                {user.name.charAt(0)}
              </div>
              <span className="text-sm font-medium">
                {user.name}
              </span>
              {user.role === 'admin' && (
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-xs rounded-full border border-amber-500/30">
                  管理者
                </span>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm"
            >
              ログアウト
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
