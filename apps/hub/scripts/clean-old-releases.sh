#!/usr/bin/env bash
set -euo pipefail

KEEP_COUNT="${1:-5}"
APP_ROOT="$(pwd)"
RELEASES_DIR="$APP_ROOT/releases"
CURRENT_REALPATH="$(readlink -f "$APP_ROOT/current" || true)"

if [ ! -d "$RELEASES_DIR" ]; then
    echo "[clean] releases dir not found: $RELEASES_DIR"
    exit 0
fi

mapfile -t RELEASE_LIST < <(find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d | sort)

COUNT=${#RELEASE_LIST[@]}

if [ "$COUNT" -le "$KEEP_COUNT" ]; then
    echo "[clean] nothing to clean, total=$COUNT keep=$KEEP_COUNT"
    exit 0
fi

DELETE_COUNT=$((COUNT - KEEP_COUNT))

echo "[clean] total=$COUNT keep=$KEEP_COUNT delete=$DELETE_COUNT"

for ((i = 0; i < DELETE_COUNT; i++)); do
    DIR="${RELEASE_LIST[$i]}"
    
    if [ "$(readlink -f "$DIR")" = "$CURRENT_REALPATH" ]; then
        echo "[clean] skip current release: $DIR"
        continue
    fi
    
    echo "[clean] remove: $DIR"
    rm -rf "$DIR"
done

echo "[clean] done"