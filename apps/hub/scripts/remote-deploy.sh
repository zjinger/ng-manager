#!/usr/bin/env bash
set -euo pipefail

ARCHIVE_NAME="${1:-ngm-hub.tar.gz}"
APP_ROOT="$(pwd)"
RELEASES_DIR="$APP_ROOT/releases"
CURRENT_LINK="$APP_ROOT/current"

echo "[remote-deploy] app root: $APP_ROOT"
echo "[remote-deploy] archive: $ARCHIVE_NAME"

if [ ! -f "$APP_ROOT/$ARCHIVE_NAME" ]; then
    echo "[remote-deploy] archive not found: $APP_ROOT/$ARCHIVE_NAME"
    exit 1
fi

mkdir -p "$RELEASES_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
NEW_RELEASE="$RELEASES_DIR/$TIMESTAMP"

echo "[remote-deploy] create release dir: $NEW_RELEASE"
mkdir -p "$NEW_RELEASE"

echo "[remote-deploy] extract archive..."
tar -xzf "$APP_ROOT/$ARCHIVE_NAME" -C "$NEW_RELEASE"

mkdir -p "$NEW_RELEASE/logs"

cd "$NEW_RELEASE"

if [ -f "package-lock.json" ]; then
    echo "[remote-deploy] npm ci --omit=dev"
    npm ci --omit=dev
else
    echo "[remote-deploy] npm install --omit=dev"
    npm install --omit=dev
fi

echo "[remote-deploy] run db migrations..."
export NODE_ENV=production
npm run db:migrate

echo "[remote-deploy] switch current symlink..."
ln -sfn "$NEW_RELEASE" "$CURRENT_LINK"

cd "$CURRENT_LINK"

if pm2 describe ngm-hub >/dev/null 2>&1; then
    echo "[remote-deploy] reload pm2 app..."
    pm2 reload ecosystem.config.cjs --update-env
else
    echo "[remote-deploy] start pm2 app..."
    pm2 start ecosystem.config.cjs
fi

pm2 save

echo "[remote-deploy] current -> $(readlink -f "$CURRENT_LINK")"
echo "[remote-deploy] done"