# AI日報ツール

AIと対話しながら日報を作成し、課題解決に役立つリソースを自動でレコメンドするツールです。

## 機能

- **AIコーチング対話**: AIが質問しながら日々の振り返りをサポート
- **自動日報生成**: 対話内容から自動的に日報を生成
- **課題抽出**: 会話から課題を自動抽出し、ダッシュボードで可視化
- **リソースレコメンド**: 日報と課題を分析し、YouTube動画・記事・書籍を3件厳選してレコメンド

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local`ファイルを作成し、以下の環境変数を設定してください：

```bash
# 必須: OpenAI API設定
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini

# Vercel KV設定（Vercelデプロイ時は自動設定されます）
KV_REST_API_URL=
KV_REST_API_TOKEN=
KV_REST_API_READ_ONLY_TOKEN=

# オプション: レコメンド機能用APIキー
# これらのキーが設定されていない場合、検索リンクが表示されます

# YouTube Data API v3
# 取得方法: https://console.cloud.google.com/apis/credentials
YOUTUBE_API_KEY=

# Google Custom Search API
# 取得方法: https://console.cloud.google.com/apis/credentials
GOOGLE_API_KEY=
GOOGLE_CSE_ID=
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## APIキーの取得方法

### OpenAI API Key
1. [OpenAI Platform](https://platform.openai.com/)にアクセス
2. API Keysセクションで新しいキーを作成

### YouTube Data API v3（オプション）
1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクトを作成または選択
3. 「APIとサービス」→「ライブラリ」から「YouTube Data API v3」を有効化
4. 「認証情報」からAPIキーを作成

### Google Custom Search API（オプション）
1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 「APIとサービス」→「ライブラリ」から「Custom Search API」を有効化
3. 「認証情報」からAPIキーを作成
4. [Custom Search Engine](https://programmablesearchengine.google.com/)で検索エンジンを作成
   - 「検索するサイトを追加」で「ウェブ全体を検索」を選択
   - 検索エンジンID（CSE ID）をコピー
5. `.env.local`に`GOOGLE_API_KEY`と`GOOGLE_CSE_ID`を設定

### Google Books API（オプション）
- Google Custom Search APIと同じ`GOOGLE_API_KEY`を使用できます
- 追加の設定は不要です

## レコメンド機能について

レコメンド機能は、日報の内容と抽出された課題を分析し、以下の手順で最適なリソースを3つ厳選します：

1. **AIによる検索クエリ生成**: OpenAI APIを使って、日報と課題から最適な検索クエリを生成
2. **並列検索**: YouTube、ウェブ検索、書籍APIから同時にリソースを検索
3. **AIによる評価**: 検索結果をAIで評価し、課題解決に最も役立つ3つを厳選
4. **レコメンド表示**: 選ばれた理由と共に表示

**注意**: 外部APIキー（YouTube/Google Custom Search/Google Books）が設定されていない場合でも、検索リンクが表示されます。APIキーを設定すると、実際の動画・記事・書籍が自動的にレコメンドされます。

## デプロイ

### Vercelへのデプロイ

1. GitHubリポジトリにプッシュ
2. [Vercel](https://vercel.com)でプロジェクトをインポート
3. 環境変数を設定（Vercel KVは自動で設定されます）
4. デプロイ完了

詳細は [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) を参照してください。

## 使い方

1. **ログイン**: 管理者から発行されたIDでログイン
2. **振り返り開始**: 「今日の振り返りをする」からセッションを開始
3. **AIと対話**: AIの質問に答えながら、その日の出来事を振り返る
4. **日報生成**: 対話終了後、自動的に日報が生成されます
5. **リソース確認**: 日報作成後、おすすめリソースが表示されます

## 技術スタック

- **フレームワーク**: Next.js 16.1.0
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **データベース**: Vercel KV (Redis)
- **AI**: OpenAI API
- **レコメンド**: YouTube Data API, Google Custom Search API, Google Books API

## ライセンス

このプロジェクトはプライベートプロジェクトです。
