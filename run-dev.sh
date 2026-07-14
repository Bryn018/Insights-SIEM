#!/bin/bash
cd /home/z/my-project
export NODE_OPTIONS="--max-old-space-size=1024"
( ( bun run dev > /home/z/my-project/dev.log 2>&1 & ) & )
