import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getCurrentUser } from '@/lib/auth';
import { getSettings, saveConversation, getConversation } from '@/lib/storage';
import { getSystemPrompt } from '@/lib/prompts';
import { Conversation, ChatMessage } from '@/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
      const settings = await getSettings();
      const systemPrompt = getSystemPrompt(settings.questionFlow);
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

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4',
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

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: aiMessages,
      });

      const aiResponse = response.choices[0]?.message?.content || '';

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString(),
      };
      conversation.messages.push(assistantMessage);

      // 終了チェック
      if (
        aiResponse.includes('1on1はこれで終了') ||
        aiResponse.includes('本日の1on1')
      ) {
        conversation.status = 'completed';
        conversation.completedAt = new Date().toISOString();
      }

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
    return NextResponse.json(
      { success: false, error: 'チャットエラーが発生しました' },
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
