import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUsers, getUserById, saveUsers } from '@/lib/storage';
import { User } from '@/types';

const USER_COOKIE_NAME = 'current_user_id';

// ログイン（ユーザー選択）
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    const user = await getUserById(userId);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    const cookieStore = await cookies();
    cookieStore.set(USER_COOKIE_NAME, userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1週間
    });

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '認証に失敗しました' },
      { status: 500 }
    );
  }
}

// 現在のユーザー取得
export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get(USER_COOKIE_NAME)?.value;

    if (!userId) {
      return NextResponse.json({ success: true, data: null });
    }

    const user = await getUserById(userId);
    return NextResponse.json({ success: true, data: user || null });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'ユーザー情報の取得に失敗しました' },
      { status: 500 }
    );
  }
}

// ログアウト
export async function DELETE() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(USER_COOKIE_NAME);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'ログアウトに失敗しました' },
      { status: 500 }
    );
  }
}

// ユーザー一覧取得（管理者用）
export async function PUT(request: NextRequest) {
  try {
    const action = request.nextUrl.searchParams.get('action');

    if (action === 'list') {
      const users = await getUsers();
      return NextResponse.json({ success: true, data: users });
    }

    if (action === 'add') {
      const newUser: User = await request.json();
      const users = await getUsers();

      if (users.find((u) => u.id === newUser.id)) {
        return NextResponse.json(
          { success: false, error: 'ユーザーIDが既に存在します' },
          { status: 400 }
        );
      }

      users.push(newUser);
      await saveUsers(users);
      return NextResponse.json({ success: true, data: newUser });
    }

    return NextResponse.json(
      { success: false, error: '不明なアクションです' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '操作に失敗しました' },
      { status: 500 }
    );
  }
}
