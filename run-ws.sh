#!/bin/bash
cd /home/z/my-project/mini-services/siem-ws-service
# Install deps if needed
[ -d node_modules ] || bun install 2>/dev/null
( ( bun --hot index.ts > /home/z/my-project/ws.log 2>&1 & ) & )
