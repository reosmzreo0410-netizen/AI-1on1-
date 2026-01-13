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
      setLoginError('IDが見つかりません。管理者にお問い合わせください。');
      setIsLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-lg text-gray-600">読み込み中...</div>
      </div>
    );
  }

  // ログイン済みの場合
  if (currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-4xl mx-auto py-12 px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              AIコーチング
            </h1>
            <p className="text-xl text-gray-600">
              こんにちは、{currentUser.name}さん
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <a
              href="/chat"
              className="group block p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all border-l-4 border-blue-500 hover:translate-y-[-2px]"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">
                  コーチングを始める
                </h2>
              </div>
              <p className="text-gray-600">
                AIコーチと一緒に今日の振り返りをしましょう。
                気づきや改善点を見つけるお手伝いをします。
              </p>
            </a>

            <a
              href="/reports"
              className="group block p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all border-l-4 border-green-500 hover:translate-y-[-2px]"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">レポート一覧</h2>
              </div>
              <p className="text-gray-600">
                過去のコーチングセッションのレポートを確認できます。
              </p>
            </a>

            {currentUser.role === 'admin' && (
              <>
                <a
                  href="/issues"
                  className="group block p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all border-l-4 border-orange-500 hover:translate-y-[-2px]"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                      <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">
                      課題ダッシュボード
                    </h2>
                  </div>
                  <p className="text-gray-600">
                    チーム全体の課題を可視化・分析します。
                  </p>
                </a>

                <a
                  href="/settings"
                  className="group block p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all border-l-4 border-purple-500 hover:translate-y-[-2px]"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                      <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">メンバー管理</h2>
                  </div>
                  <p className="text-gray-600">
                    メンバーの追加・削除、ログイン情報の発行ができます。
                  </p>
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 未ログインの場合：ログイン画面
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 mb-6 shadow-lg">
              <svg
                className="w-10 h-10 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              AIコーチング
            </h1>
            <p className="text-gray-500">
              あなたのIDでログインしてください
            </p>
          </div>

          <form onSubmit={handleIdLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ログインID
              </label>
              <input
                type="text"
                value={inputId}
                onChange={(e) => {
                  setInputId(e.target.value);
                  setLoginError('');
                }}
                placeholder="管理者から発行されたIDを入力"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg bg-gray-50 hover:bg-white transition-colors"
                disabled={isLoggingIn}
              />
            </div>

            {loginError && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                <p className="text-red-600 text-sm">{loginError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {isLoggingIn ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  ログイン中...
                </span>
              ) : (
                'ログイン'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-center text-sm text-gray-500">
              IDをお持ちでない方は管理者にお問い合わせください
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
