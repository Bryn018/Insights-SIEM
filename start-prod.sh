#!/bin/bash
# Serve the production SIEM dashboard (standalone server).
# The build (./build.sh) bakes in the WASM-SWC / Webpack fix already.
set -e
cd "$(dirname "$0")/.next/standalone"
export NODE_OPTIONS="--max-old-space-size=512"
export PORT="${PORT:-3000}"
export HOSTNAME="0.0.0.0"
exec node server.js
