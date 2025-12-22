'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChatMessage, User } from '@/types';
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
        setError(data.error || '1on1の開始に失敗しました。OpenAI APIキーが正しく設定されているか確認してください。');
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

        if (data.data.status === 'completed') {
          setStatus('completed');
          // 日報生成をトリガー
          await generateReport();
        }
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
      await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      });
    } catch (error) {
      console.error('Failed to generate report:', error);
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
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">1on1を始める</h1>
          <p className="text-gray-600 mb-8">
            AIと1on1を行い、今日の業務内容や課題を共有しましょう。
            <br />
            会話が終わると、自動的に日報が生成されます。
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <p className="font-medium mb-2">エラーが発生しました</p>
              <p className="text-sm">{error}</p>
              <p className="text-xs mt-2 text-red-500">
                .env.local ファイルで OPENAI_API_KEY を設定してください
              </p>
            </div>
          )}

          <button
            onClick={startConversation}
            disabled={isLoading}
            className="px-8 py-4 bg-blue-600 text-white text-lg font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? '開始中...' : '1on1を開始する'}
          </button>
        </div>
      </div>
    );
  }

  // 会話中
  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-800">
          1on1 - {user?.name}
        </h1>
        <p className="text-gray-500">
          {new Date().toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <ChatInterface
          conversationId={conversationId}
          messages={messages}
          status={status}
          onSendMessage={sendMessage}
          onEndConversation={endConversation}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
