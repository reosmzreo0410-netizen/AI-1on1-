import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { getIssues } from '@/lib/storage';
import { Issue, IssueCategory } from '@/types';

// 課題一覧取得（管理者のみ）
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      );
    }

    if (!isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: '管理者権限が必要です' },
        { status: 403 }
      );
    }

    const issues = await getIssues();

    // 集計データも返す
    const categoryCount: Record<IssueCategory, number> = {
      personnel: 0,
      process: 0,
      tools: 0,
      communication: 0,
      workload: 0,
      skills: 0,
      other: 0,
    };

    const severityCount = {
      low: 0,
      medium: 0,
      high: 0,
    };

    const userIssueCount: Record<string, number> = {};
    const dateIssueCount: Record<string, number> = {};

    for (const issue of issues) {
      categoryCount[issue.category]++;
      severityCount[issue.severity]++;

      if (!userIssueCount[issue.userName]) {
        userIssueCount[issue.userName] = 0;
      }
      userIssueCount[issue.userName]++;

      if (!dateIssueCount[issue.date]) {
        dateIssueCount[issue.date] = 0;
      }
      dateIssueCount[issue.date]++;
    }

    return NextResponse.json({
      success: true,
      data: {
        issues,
        stats: {
          total: issues.length,
          byCategory: categoryCount,
          bySeverity: severityCount,
          byUser: userIssueCount,
          byDate: dateIssueCount,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '課題の取得に失敗しました' },
      { status: 500 }
    );
  }
}
