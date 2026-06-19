#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/web"

npm ci
npm run build

rm -rf "$ROOT/internal/server/static/dist"
mkdir -p "$ROOT/internal/server/static"
cp -r dist "$ROOT/internal/server/static/dist"
