# トラブルシューティングガイド

## エラー: 「すべてのAIプロバイダーでエラーが発生しました」

このエラーが発生した場合、以下の手順で確認してください。

### 1. 環境変数の設定確認

#### Vercelでの確認方法

1. [Vercel Dashboard](https://vercel.com)にアクセス
2. プロジェクト「ai-1on1-tool」を選択
3. 「Settings」→「Environment Variables」を開く
4. 以下の環境変数が設定されているか確認：
   - `OPENAI_API_KEY`（必須、または`GEMINI_API_KEY`、`ANTHROPIC_API_KEY`のいずれか）
   - `OPENAI_MODEL`（オプション、デフォルト: `gpt-4o-mini`）

#### 重要なポイント

- **環境変数の適用範囲**: 「All Environments」に設定されているか確認
  - 「Production」のみに設定されている場合、Preview環境でエラーが発生します
  - 環境変数を追加/変更した後は、**新しいデプロイが必要**です

### 2. エラーログの確認方法

#### Vercelでのログ確認

1. Vercel Dashboardでプロジェクトを開く
2. 「Logs」タブをクリック
3. エラーが発生した時間帯のログを確認
4. 以下のようなエラーメッセージを探す：
   - `No AI providers available`
   - `API key is not set`
   - `Rate limit reached`

#### ブラウザでの確認

1. ブラウザの開発者ツールを開く（F12）
2. 「Console」タブを確認
3. エラーメッセージをコピー

### 3. 環境変数の設定手順（Vercel）

#### 新規追加

1. 「Settings」→「Environment Variables」を開く
2. 「Create new」タブを選択
3. 「Environments」で「All Environments」を選択
4. キーと値を入力：
   - Key: `OPENAI_API_KEY`
   - Value: `sk-...`（実際のAPIキー）
5. 「Save」をクリック
6. **新しいデプロイを実行**（重要！）

#### 既存の環境変数を修正

1. 環境変数一覧から該当の変数をクリック
2. 「Edit」をクリック
3. 値を更新
4. 「Environments」が「All Environments」になっているか確認
5. 「Save」をクリック
6. **新しいデプロイを実行**（重要！）

### 4. デプロイの確認

#### デプロイ状態の確認

1. 「Deployments」タブを開く
2. 最新のデプロイメントが「Ready」状態か確認
3. エラーがある場合は、デプロイメントをクリックして詳細を確認

#### 手動で再デプロイ

1. 「Deployments」タブを開く
2. 最新のデプロイメントの「...」メニューをクリック
3. 「Redeploy」を選択

### 5. よくある問題と解決方法

#### 問題1: 環境変数が設定されているのにエラーが発生する

**原因**: 環境変数が「Production」のみに設定されている

**解決方法**:
1. 環境変数の設定画面を開く
2. 該当の環境変数をクリック
3. 「Edit」をクリック
4. 「Environments」で「All Environments」を選択
5. 「Save」をクリック
6. 新しいデプロイを実行

#### 問題2: 環境変数を追加したが反映されない

**原因**: 環境変数を追加した後にデプロイしていない

**解決方法**:
1. 環境変数を追加/変更した後、必ず新しいデプロイを実行
2. Vercelは環境変数の変更を自動検出しないため、手動で再デプロイが必要

#### 問題3: 「Rate limit reached」エラー

**原因**: APIのレート制限に達した

**解決方法**:
1. 複数のAIプロバイダーを設定（`GEMINI_API_KEY`、`ANTHROPIC_API_KEY`）
2. `AI_PROVIDER_PRIORITY`で優先順位を設定
3. レート制限に達した場合、自動的に次のプロバイダーにフォールバック

#### 問題4: ローカルでは動作するが、Vercelでエラーが発生する

**原因**: 環境変数がVercelに設定されていない

**解決方法**:
1. `.env.local`の環境変数をVercelにコピー
2. 「All Environments」に設定
3. 新しいデプロイを実行

### 6. 必要な環境変数の一覧

#### 必須（少なくとも1つ）

- `OPENAI_API_KEY` - OpenAI APIキー
- または `GEMINI_API_KEY` - Google Gemini APIキー
- または `ANTHROPIC_API_KEY` - Anthropic Claude APIキー

#### 推奨

- `OPENAI_MODEL` - OpenAIモデル名（デフォルト: `gpt-4o-mini`）
- `GEMINI_MODEL` - Geminiモデル名（デフォルト: `gemini-1.5-flash`）
- `CLAUDE_MODEL` - Claudeモデル名（デフォルト: `claude-3-5-sonnet-20241022`）
- `AI_PROVIDER_PRIORITY` - プロバイダーの優先順位（デフォルト: `openai,gemini,claude`）

#### オプション（レコメンド機能用）

- `YOUTUBE_API_KEY` - YouTube Data API v3キー
- `GOOGLE_API_KEY` - Google Custom Search APIキー
- `GOOGLE_CSE_ID` - Google Custom Search Engine ID

#### Vercel KV（自動設定）

- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `KV_REST_API_READ_ONLY_TOKEN`

### 7. エラーメッセージの見方

#### 「No AI providers available」

- **意味**: すべてのAIプロバイダーのAPIキーが設定されていない
- **解決方法**: `OPENAI_API_KEY`、`GEMINI_API_KEY`、`ANTHROPIC_API_KEY`のいずれかを設定

#### 「All AI providers failed」

- **意味**: すべてのプロバイダーでエラーが発生した
- **解決方法**: 
  1. エラーログを確認して詳細を把握
  2. APIキーが正しいか確認
  3. レート制限に達していないか確認

#### 「Rate limit reached」

- **意味**: APIのレート制限に達した
- **解決方法**: 
  1. しばらく待ってから再試行
  2. 複数のプロバイダーを設定して自動フォールバックを利用

### 8. サポートが必要な場合

エラーが解決しない場合は、以下の情報を確認してください：

1. **エラーメッセージの全文**
2. **発生した環境**（Production/Preview/Development）
3. **Vercelのログ**（「Logs」タブから）
4. **環境変数の設定状況**（スクリーンショット推奨）
5. **デプロイメントの状態**（成功/失敗）

これらの情報があれば、より具体的な解決策を提案できます。
