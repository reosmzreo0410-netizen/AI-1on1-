import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import {
  getConversation,
  saveReport,
  getReportsByUser,
  getAllReports,
  getReport,
  saveIssue,
} from '@/lib/storage';
import {
  getReportGenerationPrompt,
  getIssueExtractionPrompt,
} from '@/lib/prompts';
import { DailyReport, Issue, IssueCategory } from '@/types';

function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }
  return new OpenAI({ apiKey });
}

function getModel(): string {
  const model = process.env.OPENAI_MODEL;
  const validModels = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'];
  if (model && validModels.includes(model)) {
    return model;
  }
  return 'gpt-4o-mini';
}

// 日報生成
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      );
    }

    const { conversationId } = await request.json();

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

    const openai = getOpenAI();

    // 日報生成
    const reportPrompt = getReportGenerationPrompt(
      conversation.messages,
      user.name
    );

    const reportResponse = await openai.chat.completions.create({
      model: getModel(),
      messages: [{ role: 'user', content: reportPrompt }],
    });

    const reportContent = reportResponse.choices[0]?.message?.content || '';

    const report: DailyReport = {
      id: `report_${Date.now()}`,
      conversationId,
      userId: user.id,
      userName: user.name,
      date: conversation.date,
      content: reportContent,
      tasks: [],
      achievements: [],
      issues: [],
      tomorrowPlan: [],
      suggestions: [],
      createdAt: new Date().toISOString(),
    };

    await saveReport(report);

    // 課題抽出
    const issuePrompt = getIssueExtractionPrompt(
      conversation.messages,
      user.name
    );

    const issueResponse = await openai.chat.completions.create({
      model: getModel(),
      messages: [{ role: 'user', content: issuePrompt }],
    });

    const issueContent = issueResponse.choices[0]?.message?.content || '';

    try {
      const issueData = JSON.parse(issueContent);
      if (issueData.issues && Array.isArray(issueData.issues)) {
        for (const item of issueData.issues) {
          const issue: Issue = {
            id: `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            conversationId,
            userId: user.id,
            userName: user.name,
            date: conversation.date,
            content: item.content,
            category: item.category as IssueCategory,
            severity: item.severity,
            createdAt: new Date().toISOString(),
          };
          await saveIssue(issue);
        }
      }
    } catch (e) {
      console.error('Failed to parse issues:', e);
    }

    return NextResponse.json({ success: true, data: report });
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json(
      { success: false, error: '日報の生成に失敗しました' },
      { status: 500 }
    );
  }
}

// 日報一覧取得
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      );
    }

    const reportId = request.nextUrl.searchParams.get('id');
    const all = request.nextUrl.searchParams.get('all');

    // 特定の日報を取得
    if (reportId) {
      const report = await getReport(reportId);
      if (!report) {
        return NextResponse.json(
          { success: false, error: '日報が見つかりません' },
          { status: 404 }
        );
      }

      // 自分の日報か、管理者のみ閲覧可能
      if (report.userId !== user.id && !isAdmin(user)) {
        return NextResponse.json(
          { success: false, error: '権限がありません' },
          { status: 403 }
        );
      }

      return NextResponse.json({ success: true, data: report });
    }

    // 全ユーザーの日報（管理者のみ）
    if (all === 'true' && isAdmin(user)) {
      const reports = await getAllReports();
      return NextResponse.json({ success: true, data: reports });
    }

    // 自分の日報一覧
    const reports = await getReportsByUser(user.id);
    return NextResponse.json({ success: true, data: reports });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '日報の取得に失敗しました' },
      { status: 500 }
    );
  }
}
