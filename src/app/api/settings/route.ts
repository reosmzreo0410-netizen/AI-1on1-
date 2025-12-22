import { NextRequest, NextResponse } from 'next/server';
import { getSettings, saveSettings } from '@/lib/storage';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { Settings } from '@/types';

// 設定取得
export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '設定の取得に失敗しました' },
      { status: 500 }
    );
  }
}

// 設定更新（管理者のみ）
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { success: false, error: '管理者権限が必要です' },
        { status: 403 }
      );
    }

    const settings: Settings = await request.json();
    await saveSettings(settings);

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '設定の保存に失敗しました' },
      { status: 500 }
    );
  }
}
