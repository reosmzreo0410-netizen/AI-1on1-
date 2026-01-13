import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import {
  getConversation,
  saveReport,
  getReportsByUser,
  getAllReports,
  getReport,
  saveIssue,
  deleteReport,
} from '@/lib/storage';
import {
  getReportGenerationPrompt,
  getIssueExtractionPrompt,
} from '@/lib/prompts';
import { generateRecommendations } from '@/lib/recommendations';
import { chatCompletion } from '@/lib/ai-providers';
import { DailyReport, Issue, IssueCategory, Recommendation } from '@/types';

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

    // 日報生成（複数プロバイダー対応）
    const reportPrompt = getReportGenerationPrompt(
      conversation.messages,
      user.name
    );

    const reportResult = await chatCompletion(
      [{ role: 'user', content: reportPrompt }],
      { temperature: 0.7 }
    );

    const reportContent = reportResult.content;

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

    // 課題抽出（複数プロバイダー対応）
    const issuePrompt = getIssueExtractionPrompt(
      conversation.messages,
      user.name
    );

    try {
      const issueResult = await chatCompletion(
        [{ role: 'user', content: issuePrompt }],
        { 
          temperature: 0.3,
          responseFormat: { type: 'json_object' }
        }
      );

      const issueContent = issueResult.content;
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
        // レコメンド生成（課題を優先的に活用）
        try {
          const recommendations = await generateRecommendations({
            reportContent: reportContent,
            issues: issueData.issues,
          });
          report.recommendations = recommendations;
        } catch (recError) {
          console.error('Failed to generate recommendations:', recError);
          // エラー時は空配列を設定（フォールバックはgenerateRecommendations内で処理）
          report.recommendations = [];
        }
      }
    } catch (e) {
      console.error('Failed to parse issues:', e);
    }

    // 課題抽出結果が空の場合もレポート内容からレコメンドを生成
    if (!report.recommendations || report.recommendations.length === 0) {
      try {
        const recommendations = await generateRecommendations({
          reportContent: reportContent,
          issues: [],
        });
        report.recommendations = recommendations;
      } catch (recError) {
        console.error('Failed to generate recommendations (fallback):', recError);
        // エラー時は空配列を設定（フォールバックはgenerateRecommendations内で処理）
        report.recommendations = [];
      }
    }

    await saveReport(report);

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

// 日報削除（管理者のみ）
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      );
    }

    // 管理者のみ削除可能
    if (!isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: '管理者のみ削除できます' },
        { status: 403 }
      );
    }

    const { reportId } = await request.json();

    if (!reportId) {
      return NextResponse.json(
        { success: false, error: 'reportId が必要です' },
        { status: 400 }
      );
    }

    // 日報が存在するか確認
    const report = await getReport(reportId);
    if (!report) {
      return NextResponse.json(
        { success: false, error: '日報が見つかりません' },
        { status: 404 }
      );
    }

    // 日報を削除
    const success = await deleteReport(reportId);
    if (!success) {
      return NextResponse.json(
        { success: false, error: '日報の削除に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: '日報を削除しました' });
  } catch (error) {
    console.error('Report deletion error:', error);
    return NextResponse.json(
      { success: false, error: '日報の削除に失敗しました' },
      { status: 500 }
    );
  }
}
