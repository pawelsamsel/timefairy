#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! docker compose ps postgres --status running --quiet 2>/dev/null | grep -q .; then
  echo "Starting Docker Postgres (port 5434, your data volume)…"
  docker compose up -d postgres
fi

export DATABASE_URL="${DATABASE_URL:-postgresql://timefairy:timefairy@127.0.0.1:5434/timefairy?schema=public}"
export JWT_SECRET="${JWT_SECRET:-dev-jwt-secret-change-in-production}"
export JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET:-dev-refresh-secret-change-in-production}"
export API_PORT="${API_PORT:-3000}"

echo "Backup: .backups/docker-before-local.sql"
echo "Database: $DATABASE_URL"
echo "API: http://localhost:${API_PORT}"
echo "Web: devbox run -- pnpm --filter @timefairy/web dev  →  http://localhost:5173"
echo ""

exec devbox run -- env \
  DATABASE_URL="$DATABASE_URL" \
  JWT_SECRET="$JWT_SECRET" \
  JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET" \
  API_PORT="$API_PORT" \
  pnpm --filter @timefairy/api dev
