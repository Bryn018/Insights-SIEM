#!/bin/bash
# Build the production SIEM dashboard.
# FIX: WSL2 + Next.js 16 native SWC crashes with SIGBUS. Force the WASM
# SWC compiler (NEXT_TEST_WASM=1) and the Webpack builder (--webpack),
# which avoids the native binary entirely. Run from the project root.
set -e
cd "$(dirname "$0")"
export NODE_OPTIONS="--max-old-space-size=1536"
export NEXT_TELEMETRY_DISABLED=1
export NEXT_TEST_WASM=1
rm -rf .next
npx next build --webpack
# Bundle static assets + public into the standalone server (build script also does this)
cp -r .next/static .next/standalone/.next/ 2>/dev/null || true
cp -r public .next/standalone/ 2>/dev/null || true
echo "Build complete. Run ./start-prod.sh to serve."
