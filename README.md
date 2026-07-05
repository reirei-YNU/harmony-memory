# harmony-memory

ピアノ練習の録音を **曲ごと・レベルごと** に整理し、先生や練習仲間と共有できる PWA（インストール可能なWebアプリ）です。

## 主な機能

- **録音**: ブラウザのマイクから直接録音。Opus (48kbps) で圧縮保存するため、たくさんのテイクを保存できます。
- **曲ごとの見出し**: 録音は必ず「曲」に紐づき、曲名を見出しにして一覧表示されます。
- **レベルラベル**: 各録音に「初級 / 中級 / 上級 / 発表会用」などのレベルラベルを付けられます（グループごとにカスタマイズ可）。
- **並び替え・絞り込み**: 「曲ごと」「レベルごと」の表示切り替え、レベルでの絞り込み、新しい順・古い順の並び替えに対応。
- **共有**: 招待コードで「グループ」（教室・練習仲間など）を作成・参加でき、グループ内の全員がお互いの録音を聴けます。
- **ストレージ使用量の可視化**: グループの録音容量（Supabase無料枠 1GB を目安）をメーターで確認できます。
- **PWA**: スマホやPCに「アプリ」としてインストールできます。

## 技術構成

- [Vite](https://vitejs.dev/) + React + TypeScript
- [Supabase](https://supabase.com/) (Auth / Postgres / Storage) — 認証・データ共有・音声ファイル保存に使用。**クレジットカード登録なしで無料枠が使えます**
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) — インストール可能なPWA化

GitHub Pages は静的サイトホスティングのみでバックエンドを持たないため、ユーザー間で本当にデータを共有するために Supabase を利用しています。

## セットアップ

### 1. Supabase プロジェクトを作成する

1. [Supabase](https://supabase.com/) にアクセスし、GitHubアカウントなどでサインアップします（クレジットカード不要）。
2. 「New project」で新しいプロジェクトを作成します（リージョンは `Northeast Asia (Tokyo)` がおすすめ）。
3. 左メニュー **SQL Editor** を開き、このリポジトリの [`supabase/setup.sql`](./supabase/setup.sql) の中身を丸ごと貼り付けて実行します。これでテーブル・セキュリティルール（RLS）・録音用ストレージバケットが一括で作成されます。
4. 左メニュー **Authentication → Providers → Email** で、「Confirm email」をオフにすることをおすすめします（オンのままだと新規登録のたびに確認メールのクリックが必要になります）。
5. 左メニュー **Project Settings → API** で `Project URL` と `anon public` キーを控えます。

`setup.sql` は何度実行しても安全です（既存のテーブル/ポリシーを壊さず、最新の定義に更新し直します）。リポジトリ更新後にスキーマ変更があった場合は、もう一度全体を実行し直してください。

> Database Branching を使っている場合は、SQL Editor 上部のブランチ表示が、アプリの `VITE_SUPABASE_URL` が向いているブランチと一致していることを確認してから実行してください。ブランチが違うと「実行は成功したのにアプリからは何も見えない」状態になります。

### 2. 環境変数を設定する

```bash
cp .env.example .env
```

`.env` に Supabase の `Project URL` と `anon public` キーを貼り付けます。

### 3. ローカルで起動する

```bash
npm install
npm run dev
```

`http://localhost:5173/harmony-memory/` を開いて動作を確認できます。

### 4. GitHub Pages へのデプロイ

`main` ブランチに push すると `.github/workflows/static.yml` が自動でビルド・デプロイします。事前に以下をリポジトリの **Settings > Secrets and variables > Actions** に登録してください（`.env` と同じ値）。

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

また、リポジトリの **Settings > Pages** で Source を "GitHub Actions" に設定してください。デプロイが終わると `https://<ユーザー名>.github.io/harmony-memory/` でスマホからもPCからもアクセスできます。

## 使い方

1. 新規登録してログインします。
2. 「新しいグループを作る」で自分の教室・練習グループを作成するか、先生からもらった招待コードで参加します。
3. 「録音する」から曲を選択（または新規追加）し、レベルを選んで録音します。
4. トップ画面で「曲ごと」「レベルごと」の表示を切り替えたり、レベルで絞り込んだりして練習記録を振り返れます。
5. 同じグループに参加している先生・仲間は、あなたの録音をすぐに聴くことができます。
