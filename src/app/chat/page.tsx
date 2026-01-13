'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChatMessage, Recommendation, User } from '@/types';
import ChatInterface from '@/components/ChatInterface';

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<'in_progress' | 'completed'>('in_progress');
  const [isLoading, setIsLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [reportId, setReportId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      // 認証チェック
      const authRes = await fetch('/api/auth');
      const authData = await authRes.json();

      if (!authData.data) {
        router.push('/');
        return;
      }

      setUser(authData.data);
      setInitializing(false);
    };
    init();
  }, [router]);

  const startConversation = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });

      const data = await res.json();
      if (data.success) {
        setConversationId(data.data.conversationId);
        setMessages([
          {
            role: 'assistant',
            content: data.data.message,
            timestamp: new Date().toISOString(),
          },
        ]);
      } else {
        setError(data.error || 'セッションの開始に失敗しました。OpenAI APIキーが正しく設定されているか確認してください。');
      }
    } catch (err) {
      console.error('Failed to start conversation:', err);
      setError('サーバーとの通信に失敗しました。');
    }
    setIsLoading(false);
  };

  const sendMessage = async (message: string) => {
    if (!conversationId) return;

    // ユーザーメッセージを即座に表示
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'message',
          conversationId,
          message,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const aiMessage: ChatMessage = {
          role: 'assistant',
          content: data.data.message,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
    setIsLoading(false);
  };

  const endConversation = async () => {
    if (!conversationId) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end', conversationId }),
      });

      const data = await res.json();
      if (data.success) {
        setStatus('completed');
        await generateReport();
      }
    } catch (error) {
      console.error('Failed to end conversation:', error);
    }
    setIsLoading(false);
  };

  const generateReport = async () => {
    if (!conversationId) return;

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      });
      const data = await res.json();
      if (data.success) {
        setReportId(data.data.id);
        // レコメンドが存在する場合のみ設定（空配列の場合は設定しない）
        if (data.data.recommendations && data.data.recommendations.length > 0) {
          setRecommendations(data.data.recommendations);
        } else {
          setRecommendations([]);
        }
      } else {
        console.error('Report generation failed:', data.error);
        setRecommendations([]);
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      setRecommendations([]);
    }
  };

  if (initializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  // 会話開始前
  if (!conversationId) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 mb-6">
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
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-3">
              今日の振り返り
            </h1>
            <p className="text-gray-600 text-lg">
              AIと対話しながら日報を作成しましょう
            </p>
          </div>

          <div className="bg-blue-50 rounded-xl p-6 mb-8">
            <h2 className="font-semibold text-blue-800 mb-3">📝 日報の作成について</h2>
            <ul className="space-y-2 text-blue-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                今日一日を振り返って話すだけでOK
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                うまくいったこと、困ったことを整理
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                AIが質問しながら深掘りをサポート
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                終了後、自動的に日報が作成されます
              </li>
            </ul>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <p className="font-medium mb-2">エラーが発生しました</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={startConversation}
            disabled={isLoading}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-lg font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 shadow-lg hover:shadow-xl"
          >
            {isLoading ? (
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
                準備中...
              </span>
            ) : (
              '振り返りを始める'
            )}
          </button>
        </div>
      </div>
    );
  }

  // 会話中
  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            日報作成
          </h1>
          <p className="text-gray-500">
            {user?.name}さん • {new Date().toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        {status === 'in_progress' && (
          <div className="flex items-center gap-2 text-green-600">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            対話中
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <ChatInterface
          conversationId={conversationId}
          messages={messages}
          status={status}
          onSendMessage={sendMessage}
          onEndConversation={endConversation}
          isLoading={isLoading}
          recommendations={recommendations}
          reportId={reportId || undefined}
        />
      </div>
    </div>
  );
}
