import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { saveConversation, getConversation, getReportsByUser } from '@/lib/storage';
import { getCoachingSystemPrompt } from '@/lib/prompts';
import { chatCompletion } from '@/lib/ai-providers';
import { Conversation, ChatMessage } from '@/types';

// 会話開始
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      );
    }

    const { action, conversationId, message } = await request.json();

    // 新規会話開始
    if (action === 'start') {
      // 過去のレポートを取得し、要約を生成
      const recentReports = await getReportsByUser(user.id);
      const recentReportsSummary = recentReports
        .slice(0, 3) // 最新3件のレポートを対象
        .map((report) => `日付: ${report.date}\n内容の要約: ${report.content.substring(0, 100)}...`); // 簡潔な要約（配列のまま）

      const systemPrompt = getCoachingSystemPrompt(user.name, recentReportsSummary);
      const now = new Date();

      const conversation: Conversation = {
        id: `conv_${now.getTime()}`,
        userId: user.id,
        userName: user.name,
        date: now.toISOString().split('T')[0],
        messages: [
          {
            role: 'system',
            content: systemPrompt,
            timestamp: now.toISOString(),
          },
        ],
        status: 'in_progress',
        createdAt: now.toISOString(),
      };

      // 最初のAI応答を生成（複数プロバイダー対応）
      const result = await chatCompletion(
        [{ role: 'system', content: systemPrompt }],
        { temperature: 0.7 }
      );

      const aiResponse = result.content;

      conversation.messages.push({
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString(),
      });

      await saveConversation(conversation);

      return NextResponse.json({
        success: true,
        data: {
          conversationId: conversation.id,
          message: aiResponse,
        },
      });
    }

    // メッセージ送信
    if (action === 'message') {
      if (!conversationId || !message) {
        return NextResponse.json(
          { success: false, error: 'conversationId と message が必要です' },
          { status: 400 }
        );
      }

      const conversation = await getConversation(conversationId);
      if (!conversation) {
        return NextResponse.json(
          { success: false, error: '会話が見つかりません' },
          { status: 404 }
        );
      }

      // ユーザーメッセージを追加
      const userMessage: ChatMessage = {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      };
      conversation.messages.push(userMessage);

      // AI応答を生成（複数プロバイダー対応）
      const aiMessages = conversation.messages.map((m) => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      }));

      const result = await chatCompletion(aiMessages, { temperature: 0.7 });
      const aiResponse = result.content;

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString(),
      };
      conversation.messages.push(assistantMessage);

      // 終了チェック（コーチングスタイルでは自動終了しない）

      await saveConversation(conversation);

      return NextResponse.json({
        success: true,
        data: {
          message: aiResponse,
          status: conversation.status,
        },
      });
    }

    // 会話終了
    if (action === 'end') {
      if (!conversationId) {
        return NextResponse.json(
          { success: false, error: 'conversationId が必要です' },
          { status: 400 }
        );
      }

      const conversation = await getConversation(conversationId);
      if (!conversation) {
        return NextResponse.json(
          { success: false, error: '会話が見つかりません' },
          { status: 404 }
        );
      }

      conversation.status = 'completed';
      conversation.completedAt = new Date().toISOString();
      await saveConversation(conversation);

      return NextResponse.json({
        success: true,
        data: { conversationId },
      });
    }

    return NextResponse.json(
      { success: false, error: '不明なアクションです' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Chat error:', error);
    const errorMessage = error instanceof Error ? error.message : 'チャットエラーが発生しました';
    
    // すべてのプロバイダーが失敗した場合
    if (errorMessage.includes('All AI providers failed')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'すべてのAIプロバイダーでエラーが発生しました。環境変数を確認してください（OPENAI_API_KEY、GEMINI_API_KEY、ANTHROPIC_API_KEYのいずれかが必要です）。' 
        },
        { status: 500 }
      );
    }
    
    // APIキーが設定されていない場合
    if (errorMessage.includes('API key is not set') || errorMessage.includes('API_KEY')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'AIプロバイダーのAPIキーが設定されていません。OPENAI_API_KEY、GEMINI_API_KEY、ANTHROPIC_API_KEYのいずれかを設定してください。' 
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// 会話取得
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      );
    }

    const conversationId = request.nextUrl.searchParams.get('id');
    if (!conversationId) {
      return NextResponse.json(
        { success: false, error: 'id が必要です' },
        { status: 400 }
      );
    }

    const conversation = await getConversation(conversationId);
    if (!conversation) {
      return NextResponse.json(
        { success: false, error: '会話が見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: conversation });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '会話の取得に失敗しました' },
      { status: 500 }
    );
  }
}
