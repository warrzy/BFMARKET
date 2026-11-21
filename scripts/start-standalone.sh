#!/usr/bin/env sh
# Lance le serveur Next.js « standalone » (identique à l'image Docker) après un `next build`.
set -e
cp -r public .next/standalone/ 2>/dev/null || true
mkdir -p .next/standalone/.next && cp -r .next/static .next/standalone/.next/
cd .next/standalone
exec node server.js
