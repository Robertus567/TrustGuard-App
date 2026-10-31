#!/usr/bin/env bash
# Menjalankan TrustGuard di Mac/Linux.
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then echo "Node.js belum terpasang. Unduh dari https://nodejs.org"; exit 1; fi
[ -f .env ] || cp .env.example .env
OPEN=1 node server.js
