#!/bin/sh
set -eu
cd "$(dirname "$0")"
echo "DramaForge Connector v1.7.0"
command -v node >/dev/null || { echo 'Node.js 20+ is required'; exit 1; }
node bridge/server.mjs --origin 'https://dramaforge-lemon-ten.vercel.app'
