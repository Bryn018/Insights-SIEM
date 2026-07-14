#!/bin/bash
cd /home/z/my-project
export NODE_OPTIONS="--max-old-space-size=768"
# Double fork to fully detach
( ( bun .next/standalone/server.js > /home/z/my-project/dev.log 2>&1 & ) & )
