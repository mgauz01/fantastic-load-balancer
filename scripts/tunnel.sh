#!/usr/bin/env bash
# Expose a local port to your Windows browser via a quick tunnel.
# Prefers cloudflared (stable HTTPS + WebSockets for Vite HMR); falls back to localtunnel.
set -euo pipefail

PORT="${1:-5173}"
TARGET="http://127.0.0.1:${PORT}"

echo "Tunneling ${TARGET} for Windows browser access..."
echo ""

if command -v cloudflared >/dev/null 2>&1; then
  echo "Using cloudflared. Open the https://*.trycloudflare.com URL in Windows."
  echo "Install: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
  echo ""
  exec cloudflared tunnel --url "${TARGET}"
fi

echo "cloudflared not found — using localtunnel (npx)."
echo "Open the printed https://*.loca.lt URL in Windows."
echo "Tip: install cloudflared for better Vite HMR over the tunnel."
echo ""
exec npx --yes localtunnel --port "${PORT}"
