'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, User, Question } from '@/types';
import QuestionFlowEditor from '@/components/QuestionFlowEditor';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

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

      <div className="bg-white rounded-xl shadow-lg p-6">
        {settings && (
          <QuestionFlowEditor
            questions={settings.questionFlow}
            onSave={handleSaveQuestions}
          />
        )}
      </div>
    </div>
  );
}
