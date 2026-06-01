#!/bin/sh
set -e
cd /app/apps/api
./node_modules/.bin/prisma migrate deploy
if [ -f prisma/seed.js ]; then node prisma/seed.js; fi
exec node dist/src/main.js
