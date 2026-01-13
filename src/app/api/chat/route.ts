import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getCurrentUser } from '@/lib/auth';
import { saveConversation, getConversation, getReportsByUser } from '@/lib/storage';
import { getCoachingSystemPrompt } from '@/lib/prompts';
import { Conversation, ChatMessage } from '@/types';

function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }
  return new OpenAI({ apiKey });
}

const getModel = () => {
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const validModels = ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'];
  if (!validModels.includes(model)) {
    console.warn(`Invalid OPENAI_MODEL specified: ${model}. Falling back to gpt-4o-mini.`);
    return 'gpt-4o-mini';
  }
  return model;
};

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

      // 最初のAI応答を生成
      const aiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
      ];

      const openai = getOpenAI();
      const response = await openai.chat.completions.create({
        model: getModel(),
        messages: aiMessages,
      });

      const aiResponse = response.choices[0]?.message?.content || '';

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

      // AI応答を生成
      const aiMessages: OpenAI.Chat.ChatCompletionMessageParam[] =
        conversation.messages.map((m) => ({
          role: m.role as 'system' | 'user' | 'assistant',
          content: m.content,
        }));

      const openai = getOpenAI();
      const response = await openai.chat.completions.create({
        model: getModel(),
        messages: aiMessages,
      });

      const aiResponse = response.choices[0]?.message?.content || '';

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
    
    if (errorMessage.includes('OPENAI_API_KEY')) {
      return NextResponse.json(
        { success: false, error: '.env.local ファイルで OPENAI_API_KEY を設定してください' },
        { status: 500 }
      );
    }
    if (errorMessage.includes('invalid model ID')) {
      return NextResponse.json(
        { success: false, error: 'OpenAIモデルIDが無効です。環境変数 OPENAI_MODEL を確認してください。' },
        { status: 400 }
      );
    }
    // レート制限エラー（RPM/TPM）の検出
    if (errorMessage.includes('Rate limit') || errorMessage.includes('requests per min (RPM)') || errorMessage.includes('tokens per min (TPM)')) {
      const rateLimitType = errorMessage.includes('RPM') ? 'リクエスト数' : 
                           errorMessage.includes('TPM') ? 'トークン数' : 'レート';
      // 待機時間を抽出（例: "Please try again in 20s"）
      const waitTimeMatch = errorMessage.match(/try again in (\d+[smh])/i);
      const waitTime = waitTimeMatch ? waitTimeMatch[1] : 'しばらく';
      
      return NextResponse.json(
        { 
          success: false, 
          error: `OpenAI APIの${rateLimitType}制限に達しました。${waitTime}待ってから再度お試しください。リコメンド機能は自動的にフォールバックモードで動作します。` 
        },
        { status: 429 }
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
