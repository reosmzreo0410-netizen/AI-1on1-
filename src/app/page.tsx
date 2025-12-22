'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/types';

export default function HomePage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      // 現在のユーザーを確認
      const authRes = await fetch('/api/auth');
      const authData = await authRes.json();
      if (authData.data) {
        setCurrentUser(authData.data);
      }

      // ユーザー一覧を取得
      const usersRes = await fetch('/api/auth?action=list', { method: 'PUT' });
      const usersData = await usersRes.json();
      if (usersData.data) {
        setUsers(usersData.data);
      }

      setLoading(false);
    };
    init();
  }, []);

  const handleLogin = async (userId: string) => {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const data = await res.json();
    if (data.success) {
      router.refresh();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  // ログイン済みの場合
  if (currentUser) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            AI 1on1 ツール
          </h1>
          <p className="text-xl text-gray-600">
            ようこそ、{currentUser.name}さん
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <a
            href="/chat"
            className="block p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow border-l-4 border-blue-500"
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              1on1を始める
            </h2>
            <p className="text-gray-600">
              AIと1on1を行い、今日の業務内容や課題を共有しましょう。
            </p>
          </a>

          <a
            href="/reports"
            className="block p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow border-l-4 border-green-500"
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-3">日報一覧</h2>
            <p className="text-gray-600">
              過去の日報を確認できます。
            </p>
          </a>

          {currentUser.role === 'admin' && (
            <>
              <a
                href="/issues"
                className="block p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow border-l-4 border-orange-500"
              >
                <h2 className="text-2xl font-bold text-gray-800 mb-3">
                  課題ダッシュボード
                </h2>
                <p className="text-gray-600">
                  チーム全体の課題を可視化・分析します。
                </p>
              </a>

              <a
                href="/settings"
                className="block p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow border-l-4 border-purple-500"
              >
                <h2 className="text-2xl font-bold text-gray-800 mb-3">設定</h2>
                <p className="text-gray-600">
                  1on1の質問項目やユーザーを管理します。
                </p>
              </a>
            </>
          )}
        </div>
      </div>
    );
  }

  // 未ログインの場合：ログイン画面
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              AI 1on1 ツール
            </h1>
            <p className="text-gray-600">ユーザーを選択してログイン</p>
          </div>

          <div className="space-y-3">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => handleLogin(user.id)}
                className="w-full p-4 text-left bg-gray-50 hover:bg-blue-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-800">{user.name}</div>
                    <div className="text-sm text-gray-500">ID: {user.id}</div>
                  </div>
                  {user.role === 'admin' && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                      管理者
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
