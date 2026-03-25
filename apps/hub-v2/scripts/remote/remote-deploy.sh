#!/usr/bin/env bash
# 远程部署脚本，上传构建产物，解压，安装依赖，切换版本，重启服务
# 用法：remote-deploy.sh <archive-path>
# 其中 archive-path 是本地构建产物的路径，通常是一个 tar.gz 文件
# 远程部署步骤：
#   1. 确保服务器上有 /opt/ngm-hub-v2
#   2. 将 archive-path 上传到服务器的 /opt/ngm-hub-v2/incoming 目录
#   3. 在服务器上解压到 /opt/ngm-hub-v2/releases/<timestamp> 目录
#   4. 安装依赖，运行数据库迁移
#   5. 切换 /opt/ngm-hub/current 指向新的 release
#   6. 重启 pm2 服务
# 每次发布都执行：
#   - 校验归档包
#   - 创建 release 目录
#   - 解压
#   - 安装依赖
#   - 执行 db migration
#   - 建立 shared 软链
#   - 切 current
#   - reload pm2
#   - 清理旧版本

set -euo pipefail

APP_ROOT="/opt/ngm-hub-v2"
ARCHIVE_PATH="${1:-}"

if [ -z "$ARCHIVE_PATH" ]; then
  echo "[remote-deploy] usage: remote-deploy.sh <archive-path>"
  exit 1
fi

if [ ! -f "$ARCHIVE_PATH" ]; then
  echo "[remote-deploy] archive not found: $ARCHIVE_PATH"
  exit 1
fi

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RELEASES_DIR="$APP_ROOT/releases"
RELEASE_DIR="$RELEASES_DIR/$TIMESTAMP"
CURRENT_LINK="$APP_ROOT/current"
LOG_DIR="$APP_ROOT/logs"
DATA_DIR="$APP_ROOT/data"

echo "[remote-deploy] app root: $APP_ROOT"
echo "[remote-deploy] archive: $ARCHIVE_PATH"
echo "[remote-deploy] release dir: $RELEASE_DIR"

echo "[remote-deploy] ensure directories"
mkdir -p "$APP_ROOT/bin"
mkdir -p "$APP_ROOT/incoming"
mkdir -p "$RELEASES_DIR"
mkdir -p "$LOG_DIR"
mkdir -p "$DATA_DIR"
mkdir -p "$RELEASE_DIR"

echo "[remote-deploy] extract archive"
tar -xzf "$ARCHIVE_PATH" -C "$RELEASE_DIR"

cd "$RELEASE_DIR"

if [ -f "package-lock.json" ]; then
  echo "[remote-deploy] npm ci --omit=dev"
  npm ci --omit=dev
else
  echo "[remote-deploy] package-lock.json missing, fallback to npm install --omit=dev"
  npm install --omit=dev
fi

echo "[remote-deploy] run db migrations"
npm run db:migrate
echo "[remote-deploy] db migrations done"

echo "[remote-deploy] link shared directories"
rm -rf "$RELEASE_DIR/logs" "$RELEASE_DIR/data"
ln -sfn "$LOG_DIR" "$RELEASE_DIR/logs"
ln -sfn "$DATA_DIR" "$RELEASE_DIR/data"

echo "[remote-deploy] switch current symlink"
ln -sfn "$RELEASE_DIR" "$CURRENT_LINK"

cd "$CURRENT_LINK"

echo "[remote-deploy] reload pm2"
pm2 reload ecosystem.config.cjs || pm2 start ecosystem.config.cjs

echo "[remote-deploy] save pm2"
pm2 save || true

if [ -x "$APP_ROOT/bin/clean-old-releases.sh" ]; then
  echo "[remote-deploy] clean old releases"
  "$APP_ROOT/bin/clean-old-releases.sh" || true
fi

echo "[remote-deploy] done"
