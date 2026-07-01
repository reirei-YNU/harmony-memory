# harmony-memory

ピアノ練習の録音を **曲ごと・レベルごと** に整理し、先生や練習仲間と共有できる PWA（インストール可能なWebアプリ）です。

## 主な機能

- **録音**: ブラウザのマイクから直接録音。Opus (48kbps) で圧縮保存するため、たくさんのテイクを保存できます。
- **曲ごとの見出し**: 録音は必ず「曲」に紐づき、曲名を見出しにして一覧表示されます。
- **レベルラベル**: 各録音に「初級 / 中級 / 上級 / 発表会用」などのレベルラベルを付けられます（グループごとにカスタマイズ可）。
- **並び替え・絞り込み**: 「曲ごと」「レベルごと」の表示切り替え、レベルでの絞り込み、新しい順・古い順の並び替えに対応。
- **共有**: 招待コードで「グループ」（教室・練習仲間など）を作成・参加でき、グループ内の全員がお互いの録音を聴けます。
- **ストレージ使用量の可視化**: グループの録音容量（Firebase無料枠 5GB を目安）をメーターで確認できます。
- **PWA**: スマホやPCに「アプリ」としてインストールできます。

## 技術構成

- [Vite](https://vitejs.dev/) + React + TypeScript
- [Firebase](https://firebase.google.com/) (Authentication / Firestore / Storage) — 認証・データ共有・音声ファイル保存に使用
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) — インストール可能なPWA化

GitHub Pages は静的サイトホスティングのみでバックエンドを持たないため、ユーザー間で本当にデータを共有するために Firebase（無料の Spark プランで運用可能）を利用しています。

## セットアップ

### 1. Firebase プロジェクトを作成する

1. [Firebase コンソール](https://console.firebase.google.com/) で新しいプロジェクトを作成します。
2. 「Authentication」→「Sign-in method」で **メール/パスワード** を有効にします。
3. 「Firestore Database」を作成します（本番モードでOK。ルールは後述のものをデプロイします）。
4. 「Storage」を有効にします。
5. 「プロジェクトの設定」→「マイアプリ」でウェブアプリを追加し、表示された設定値（`apiKey` など）を控えます。

### 2. 環境変数を設定する

```bash
cp .env.example .env
```

`.env` に Firebase の設定値を貼り付けます。

### 3. セキュリティルールをデプロイする

このリポジトリには `firestore.rules` / `storage.rules` / `firestore.indexes.json` を同梱しています。[Firebase CLI](https://firebase.google.com/docs/cli) を使ってデプロイしてください。

```bash
npm install -g firebase-tools
firebase login
firebase use --add   # 作成したプロジェクトを選択
firebase deploy --only firestore:rules,firestore:indexes,storage
```

### 4. ローカルで起動する

```bash
npm install
npm run dev
```

### 4-a. Firebase プロジェクトなしで試す（ローカルエミュレータ）

Firebase プロジェクトをまだ作っていなくても、[Firebase Local Emulator Suite](https://firebase.google.com/docs/emulator-suite) を使えばローカルで一通り動作を試せます（要 Java）。

```bash
npm install -g firebase-tools
firebase emulators:start --project demo-harmony-memory
# 別ターミナルで
VITE_USE_FIREBASE_EMULATORS=true npm run dev
```

`.env` は不要です。ログイン・グループ作成・録音・共有まですべてローカルで完結します（データはエミュレータ終了時に消えます）。Emulator UI は http://127.0.0.1:4000 で確認できます。

### 5. GitHub Pages へのデプロイ

`main` ブランチに push すると `.github/workflows/static.yml` が自動でビルド・デプロイします。事前に以下をリポジトリの **Settings > Secrets and variables > Actions** に登録してください（`.env` と同じ値）。

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

また、リポジトリの **Settings > Pages** で Source を "GitHub Actions" に設定してください。

## 使い方

1. 新規登録してログインします。
2. 「新しいグループを作る」で自分の教室・練習グループを作成するか、先生からもらった招待コードで参加します。
3. 「録音する」から曲を選択（または新規追加）し、レベルを選んで録音します。
4. トップ画面で「曲ごと」「レベルごと」の表示を切り替えたり、レベルで絞り込んだりして練習記録を振り返れます。
5. 同じグループに参加している先生・仲間は、あなたの録音をすぐに聴くことができます。
