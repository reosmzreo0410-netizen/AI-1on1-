'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/types';

export default function HomePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [inputId, setInputId] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const init = async () => {
      const authRes = await fetch('/api/auth');
      const authData = await authRes.json();
      if (authData.data) {
        setCurrentUser(authData.data);
      }
      setLoading(false);
    };
    init();
  }, []);

  const handleIdLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputId.trim()) {
      setLoginError('IDを入力してください');
      return;
    }

    setIsLoggingIn(true);
    setLoginError('');

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: inputId.trim() }),
    });
    const data = await res.json();

    if (data.success) {
      router.refresh();
      window.location.reload();
    } else {
      setLoginError('IDが見つかりません');
      setIsLoggingIn(false);
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
            AI 1on1 コーチング
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
              AIコーチと1on1を行い、今日の振り返りや目標について対話しましょう。
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
                  質問項目やメンバーを管理します。
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
              AI 1on1 コーチング
            </h1>
            <p className="text-gray-600">あなたのIDを入力してください</p>
          </div>

          <form onSubmit={handleIdLogin} className="space-y-4">
            <div>
              <input
                type="text"
                value={inputId}
                onChange={(e) => {
                  setInputId(e.target.value);
                  setLoginError('');
                }}
                placeholder="あなたのID"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                disabled={isLoggingIn}
              />
            </div>

            {loginError && (
              <p className="text-red-500 text-sm text-center">{loginError}</p>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingIn ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
