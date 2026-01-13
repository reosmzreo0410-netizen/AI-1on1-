'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/types';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // 新規メンバー追加用
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');
  const [addError, setAddError] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const init = async () => {
      // 認証チェック
      const authRes = await fetch('/api/auth');
      const authData = await authRes.json();

      if (!authData.data) {
        router.push('/');
        return;
      }

      if (authData.data.role !== 'admin') {
        router.push('/');
        return;
      }

      setUser(authData.data);

      // ユーザー一覧取得
      const usersRes = await fetch('/api/auth?action=list', { method: 'PUT' });
      const usersData = await usersRes.json();
      if (usersData.data) {
        setUsers(usersData.data);
      }

      setLoading(false);
    };
    init();
  }, [router]);

  const generateId = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewId(result);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newId.trim() || !newName.trim()) {
      setAddError('IDと名前を入力してください');
      return;
    }

    setIsAdding(true);
    setAddError('');
    setSuccessMessage('');

    const res = await fetch('/api/auth?action=add', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: newId.trim(), name: newName.trim(), role: newRole }),
    });

    const data = await res.json();

    if (data.success) {
      setUsers([...users, data.data]);
      setSuccessMessage(`${newName} (ID: ${newId}) を追加しました`);
      setNewId('');
      setNewName('');
      setNewRole('user');
    } else {
      setAddError(data.error || '追加に失敗しました');
    }

    setIsAdding(false);
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`${userName}さんを削除しますか？\n\nこの操作は取り消せません。`)) return;

    const res = await fetch('/api/auth?action=delete', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });

    const data = await res.json();

    if (data.success) {
      setUsers(users.filter((u) => u.id !== userId));
      setSuccessMessage(`${userName}さんを削除しました`);
    } else {
      alert(data.error || '削除に失敗しました');
    }
  };

  const copyLoginInfo = (u: User) => {
    const loginUrl = window.location.origin;
    const text = `【AIコーチング ログイン情報】\n\nURL: ${loginUrl}\nあなたのID: ${u.id}\n\nログイン画面でIDを入力してください。`;
    navigator.clipboard.writeText(text);
    setSuccessMessage(`${u.name}さんのログイン情報をコピーしました`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">メンバー管理</h1>
        <p className="text-gray-600 mt-2">
          メンバーの追加・削除、ログイン情報の発行ができます
        </p>
      </div>

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center justify-between">
          <span>{successMessage}</span>
          <button
            onClick={() => setSuccessMessage('')}
            className="text-green-500 hover:text-green-700"
          >
            ✕
          </button>
        </div>
      )}

      {/* 新規メンバー追加フォーム */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          新しいメンバーを追加
        </h2>

        <form onSubmit={handleAddUser} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ログインID
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newId}
                  onChange={(e) => setNewId(e.target.value)}
                  placeholder="例: tanaka01"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={generateId}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm"
                  title="ランダムIDを生成"
                >
                  自動生成
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                メンバーがログイン時に入力するIDです
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                名前
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="例: 田中太郎"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              権限
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value="user"
                  checked={newRole === 'user'}
                  onChange={() => setNewRole('user')}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-gray-700">メンバー</span>
                <span className="text-xs text-gray-500">（コーチングセッションのみ）</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value="admin"
                  checked={newRole === 'admin'}
                  onChange={() => setNewRole('admin')}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-gray-700">管理者</span>
                <span className="text-xs text-gray-500">（すべての機能にアクセス可能）</span>
              </label>
            </div>
          </div>

          {addError && (
            <p className="text-red-500 text-sm">{addError}</p>
          )}

          <button
            type="submit"
            disabled={isAdding}
            className="w-full md:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {isAdding ? '追加中...' : 'メンバーを追加'}
          </button>
        </form>
      </div>

      {/* メンバー一覧 */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          登録済みメンバー ({users.length}名)
        </h2>

        <div className="space-y-3">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-medium">
                  {u.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800">{u.name}</span>
                    {u.role === 'admin' && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded-full">
                        管理者
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">ID: {u.id}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-14 md:ml-0">
                <button
                  onClick={() => copyLoginInfo(u)}
                  className="px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 text-sm"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  ログイン情報をコピー
                </button>
                <button
                  onClick={() => handleDeleteUser(u.id, u.name)}
                  disabled={u.id === user.id}
                  className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                  title={u.id === user.id ? '自分自身は削除できません' : ''}
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>

        {users.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            メンバーが登録されていません
          </div>
        )}
      </div>

      {/* ヘルプ */}
      <div className="mt-8 p-6 bg-blue-50 rounded-xl">
        <h3 className="font-semibold text-blue-800 mb-3">💡 使い方のヒント</h3>
        <ul className="space-y-2 text-blue-700 text-sm">
          <li>• 新しいメンバーを追加したら、「ログイン情報をコピー」でIDを共有できます</li>
          <li>• メンバーは自分のIDでログインしてコーチングセッションを開始できます</li>
          <li>• 管理者はすべてのメンバーの日報や課題ダッシュボードを確認できます</li>
        </ul>
      </div>
    </div>
  );
}
