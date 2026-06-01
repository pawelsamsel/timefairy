#!/usr/bin/env bash
set -euo pipefail

export PGHOST="${PGHOST:-/tmp}"
export PGPORT="${PGPORT:-5432}"

if ! pg_isready -q; then
  echo "PostgreSQL is not running on ${PGHOST}:${PGPORT}."
  echo "Run: devbox services up"
  exit 1
fi

psql -d postgres -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'timefairy') THEN
    CREATE ROLE timefairy WITH LOGIN PASSWORD 'timefairy' CREATEDB;
  ELSE
    ALTER ROLE timefairy WITH PASSWORD 'timefairy';
  END IF;
END
$$;
SQL

if ! psql -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = 'timefairy'" | grep -q 1; then
  psql -d postgres -c "CREATE DATABASE timefairy OWNER timefairy;"
fi

echo "Local PostgreSQL ready: timefairy@localhost:${PGPORT}/timefairy"
