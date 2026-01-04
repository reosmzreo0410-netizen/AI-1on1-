'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, User, Question } from '@/types';
import QuestionFlowEditor from '@/components/QuestionFlowEditor';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'questions' | 'members'>('members');

  // 新規メンバー追加用
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');
  const [addError, setAddError] = useState('');
  const [isAdding, setIsAdding] = useState(false);

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

      // 設定取得
      const settingsRes = await fetch('/api/settings');
      const settingsData = await settingsRes.json();
      if (settingsData.data) {
        setSettings(settingsData.data);
      }

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

  const handleSaveQuestions = async (questions: Question[]) => {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionFlow: questions }),
    });

    if (!res.ok) {
      throw new Error('保存に失敗しました');
    }

    setSettings({ questionFlow: questions });
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newId.trim() || !newName.trim()) {
      setAddError('IDと名前を入力してください');
      return;
    }

    setIsAdding(true);
    setAddError('');

    const res = await fetch('/api/auth?action=add', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: newId.trim(), name: newName.trim(), role: newRole }),
    });

    const data = await res.json();

    if (data.success) {
      setUsers([...users, data.data]);
      setNewId('');
      setNewName('');
      setNewRole('user');
    } else {
      setAddError(data.error || '追加に失敗しました');
    }

    setIsAdding(false);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('このメンバーを削除しますか？')) return;

    const res = await fetch('/api/auth?action=delete', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });

    const data = await res.json();

    if (data.success) {
      setUsers(users.filter((u) => u.id !== userId));
    } else {
      alert(data.error || '削除に失敗しました');
    }
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
      <h1 className="text-3xl font-bold text-gray-800 mb-8">設定</h1>

      {/* タブ */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('members')}
          className={`px-6 py-3 font-medium ${
            activeTab === 'members'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          メンバー管理
        </button>
        <button
          onClick={() => setActiveTab('questions')}
          className={`px-6 py-3 font-medium ${
            activeTab === 'questions'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          質問設定
        </button>
      </div>

      {/* メンバー管理タブ */}
      {activeTab === 'members' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6">メンバー管理</h2>

          {/* 新規メンバー追加フォーム */}
          <form onSubmit={handleAddUser} className="mb-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium text-gray-700 mb-4">新規メンバー追加</h3>
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">ID</label>
                <input
                  type="text"
                  value={newId}
                  onChange={(e) => setNewId(e.target.value)}
                  placeholder="例: tanaka"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">名前</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="例: 田中太郎"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">権限</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'user' | 'admin')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="user">メンバー</option>
                  <option value="admin">管理者</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isAdding}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {isAdding ? '追加中...' : '追加'}
                </button>
              </div>
            </div>
            {addError && (
              <p className="mt-2 text-red-500 text-sm">{addError}</p>
            )}
          </form>

          {/* メンバー一覧 */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-700 mb-4">登録済みメンバー</h3>
            {users.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <div className="font-medium text-gray-800">{u.name}</div>
                    <div className="text-sm text-gray-500">ID: {u.id}</div>
                  </div>
                  {u.role === 'admin' && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                      管理者
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteUser(u.id)}
                  disabled={u.id === user.id}
                  className="px-3 py-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title={u.id === user.id ? '自分自身は削除できません' : ''}
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 質問設定タブ */}
      {activeTab === 'questions' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          {settings && (
            <QuestionFlowEditor
              questions={settings.questionFlow}
              onSave={handleSaveQuestions}
            />
          )}
        </div>
      )}
    </div>
  );
}
