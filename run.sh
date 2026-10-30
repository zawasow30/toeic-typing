#!/usr/bin/env bash
set -e

# プロジェクトルートディレクトリに移動
cd "$(dirname "$0")"

# node_modulesが存在しない場合は依存パッケージをインストール
if [ ! -d "node_modules" ]; then
  echo "📦 node_modules が見つかりません。npm install を実行します..."
  npm install
fi

MODE="${1:-app}"

case "$MODE" in
  "web")
    echo "🌐 Webブラウザ版 (Vite) を起動します..."
    shift || true
    npm run dev "$@"
    ;;
  "build")
    echo "🔨 macOS アプリケーション (.app) をビルドします..."
    npm run dist:mac
    echo "✅ ビルド完了: release/mac-arm64/TOEIC Typing.app"
    ;;
  "open")
    if [ -d "release/mac-arm64/TOEIC Typing.app" ]; then
      echo "🚀 ビルド済み TOEIC Typing.app を起動します..."
      open "release/mac-arm64/TOEIC Typing.app"
    else
      echo "⚠️ ビルド済みアプリが見つかりません。先に ./run.sh build を実行してください。"
    fi
    ;;
  *)
    echo "🍎 macOS デスクトップアプリ (Electron) を起動します..."
    npm run app
    ;;
esac

