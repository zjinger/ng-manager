#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="$(pwd)"
RELEASES_DIR="$APP_ROOT/releases"
CURRENT_LINK="$APP_ROOT/current"

if [ ! -d "$RELEASES_DIR" ]; then
    echo "[rollback] releases dir not found: $RELEASES_DIR"
    exit 1
fi

mapfile -t RELEASE_LIST < <(find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d | sort)

COUNT=${#RELEASE_LIST[@]}

if [ "$COUNT" -lt 2 ]; then
    echo "[rollback] not enough releases to rollback"
    exit 1
fi

TARGET_RELEASE="${RELEASE_LIST[$((COUNT - 2))]}"

echo "[rollback] target release: $TARGET_RELEASE"

ln -sfn "$TARGET_RELEASE" "$CURRENT_LINK"
cd "$CURRENT_LINK"

if pm2 describe ngm-hub-server >/dev/null 2>&1; then
    pm2 reload ecosystem.config.cjs --update-env
else
    pm2 start ecosystem.config.cjs
fi

pm2 save

echo "[rollback] current -> $(readlink -f "$CURRENT_LINK")"
echo "[rollback] done"