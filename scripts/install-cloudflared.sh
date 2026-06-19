#!/usr/bin/env bash
# Install cloudflared globally on Linux (WSL2 / Ubuntu).
# Official docs: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/
set -euo pipefail

ARCH="$(uname -m)"
case "${ARCH}" in
  x86_64|amd64) BIN_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64" ;;
  aarch64|arm64) BIN_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64" ;;
  *)
    echo "Unsupported architecture: ${ARCH}"
    echo "See: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/"
    exit 1
    ;;
esac

echo "Installing cloudflared for ${ARCH}..."
TMP="$(mktemp)"
trap 'rm -f "${TMP}"' EXIT

curl -fsSL -o "${TMP}" "${BIN_URL}"
chmod +x "${TMP}"
"${TMP}" --version

if [[ "${EUID}" -eq 0 ]]; then
  install -m 755 "${TMP}" /usr/local/bin/cloudflared
else
  sudo install -m 755 "${TMP}" /usr/local/bin/cloudflared
fi

echo ""
echo "Installed: $(command -v cloudflared)"
cloudflared --version
echo ""
echo "Test tunnel (with app running on :5173): make tunnel"
