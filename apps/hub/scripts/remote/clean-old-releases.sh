#!/usr/bin/env bash
# 远程清理旧版本脚本，保留最新的 N 个版本，N 通过环境变量 KEEP_COUNT 配置，默认为 5
set -euo pipefail

APP_ROOT="/opt/ngm-hub"
RELEASES_DIR="$APP_ROOT/releases"
KEEP_COUNT="${KEEP_COUNT:-5}"

if [ ! -d "$RELEASES_DIR" ]; then
  echo "[clean-old-releases] releases dir not found: $RELEASES_DIR"
  exit 0
fi

cd "$RELEASES_DIR"

TOTAL=$(ls -1 | wc -l | tr -d ' ')

if [ "$TOTAL" -le "$KEEP_COUNT" ]; then
  echo "[clean-old-releases] nothing to clean, total=$TOTAL keep=$KEEP_COUNT"
  exit 0
fi

echo "[clean-old-releases] keep latest $KEEP_COUNT releases"
ls -1dt */ 2>/dev/null | tail -n +$((KEEP_COUNT + 1)) | xargs -r rm -rf

echo "[clean-old-releases] done"