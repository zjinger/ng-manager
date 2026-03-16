#!/usr/bin/env bash
# 远程回滚脚本，接收一个参数：要回滚到的版本目录名称（即 releases 下的某个文件夹名）

set -euo pipefail

APP_ROOT="/opt/ngm-hub"
VERSION="${1:-}"

if [ -z "$VERSION" ]; then
  echo "[rollback] usage: rollback.sh <release-folder-name>"
  exit 1
fi

TARGET_DIR="$APP_ROOT/releases/$VERSION"

if [ ! -d "$TARGET_DIR" ]; then
  echo "[rollback] target release not found: $TARGET_DIR"
  exit 1
fi

echo "[rollback] switch current -> $TARGET_DIR"
ln -sfn "$TARGET_DIR" "$APP_ROOT/current"

cd "$APP_ROOT/current"

echo "[rollback] reload pm2"
pm2 reload ecosystem.config.cjs || pm2 start ecosystem.config.cjs

echo "[rollback] done"