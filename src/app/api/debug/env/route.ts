import { NextRequest, NextResponse } from 'next/server';

// デバッグ用: 環境変数の状態を確認（本番環境では無効化推奨）
export async function GET(request: NextRequest) {
  // セキュリティのため、本番環境では詳細情報を返さない
  const isProduction = process.env.NODE_ENV === 'production';
  
  const envStatus = {
    nodeEnv: process.env.NODE_ENV,
    // APIキーの存在のみを確認（値は返さない）
    apiKeys: {
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
      ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    },
    models: {
      OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini (default)',
      GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-1.5-flash (default)',
      CLAUDE_MODEL: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022 (default)',
    },
    providerPriority: process.env.AI_PROVIDER_PRIORITY || 'openai,gemini,claude (default)',
    availableProviders: [] as string[],
  };

  // 利用可能なプロバイダーを確認
  if (envStatus.apiKeys.OPENAI_API_KEY) {
    envStatus.availableProviders.push('openai');
  }
  if (envStatus.apiKeys.GEMINI_API_KEY) {
    envStatus.availableProviders.push('gemini');
  }
  if (envStatus.apiKeys.ANTHROPIC_API_KEY) {
    envStatus.availableProviders.push('claude');
  }

  return NextResponse.json({
    success: true,
    data: envStatus,
    message: envStatus.availableProviders.length > 0
      ? `利用可能なプロバイダー: ${envStatus.availableProviders.join(', ')}`
      : 'エラー: 利用可能なAIプロバイダーがありません。環境変数を設定してください。',
  });
}
