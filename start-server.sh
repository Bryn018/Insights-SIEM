#!/bin/bash
cd /home/z/my-project
export NODE_OPTIONS="--max-old-space-size=768"
exec bun .next/standalone/server.js
