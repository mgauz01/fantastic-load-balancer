#!/usr/bin/env bash
# Print URLs for reaching a WSL2 dev server from a Windows browser.
set -euo pipefail

PORT="${PORT:-5173}"

WSL_IP=""
if command -v hostname >/dev/null 2>&1; then
  WSL_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
fi

echo "Reach the app from your Windows browser:"
echo ""
echo "  1) WSL localhost forwarding (if enabled):"
echo "       http://localhost:${PORT}"
echo ""
if [[ -n "${WSL_IP}" ]]; then
  echo "  2) WSL network IP:"
  echo "       http://${WSL_IP}:${PORT}"
  echo ""
fi
echo "  3) Public tunnel (works when localhost/IP do not):"
echo "       make tunnel PORT=${PORT}"
echo ""
echo "Dev (Vite + HMR): PORT=5173   Production (flb-server): PORT=8080"
