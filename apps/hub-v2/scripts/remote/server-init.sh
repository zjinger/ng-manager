#!/usr/bin/env bash
# 服务器初始化脚本，设置目录结构，检查环境，安装 pm2
# 执行一次：
#   检查 node/npm/pm2
#   创建 /opt/ngm-hub-v2 基础目录
#   初始化 pm2 startup

set -euo pipefail

APP_ROOT="/opt/ngm-hub-v2"

BIN_DIR="$APP_ROOT/bin"
RELEASES_DIR="$APP_ROOT/releases"
INCOMING_DIR="$APP_ROOT/incoming"
LOG_DIR="$APP_ROOT/logs"
DATA_DIR="$APP_ROOT/data"

echo "-----------------------------------------"
echo "[server-init] ngm-hub server initialization"
echo "-----------------------------------------"

echo "[server-init] app root: $APP_ROOT"
echo "[server-init] create directories"

mkdir -p "$BIN_DIR"
mkdir -p "$RELEASES_DIR"
mkdir -p "$INCOMING_DIR"
mkdir -p "$LOG_DIR"
mkdir -p "$DATA_DIR"

echo "[server-init] directories ready"
echo "[server-init] checking node"

if command -v node >/dev/null 2>&1; then
  NODE_VERSION=$(node -v)
  echo "[server-init] node found: $NODE_VERSION"
else
  echo "[server-init] ERROR: node not installed"
  echo "please install Node.js >= 20"
  exit 1
fi

if command -v npm >/dev/null 2>&1; then
  echo "[server-init] npm found"
else
  echo "[server-init] ERROR: npm not installed"
  exit 1
fi

echo "[server-init] checking pm2"

if command -v pm2 >/dev/null 2>&1; then
  echo "[server-init] pm2 already installed"
else
  echo "[server-init] installing pm2..."
  npm install -g pm2
fi

echo "[server-init] setup pm2 startup"
pm2 startup || true
pm2 save || true

echo "[server-init] done"
echo ""
echo "Next steps:"
echo "1. upload remote scripts:"
echo "   npm run remote:install:prod"
echo ""
echo "2. deploy first release:"
echo "   npm run release:prod"
echo ""
