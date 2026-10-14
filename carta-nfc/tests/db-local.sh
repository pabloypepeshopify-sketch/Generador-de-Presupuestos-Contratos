#!/usr/bin/env bash
# Recrea la base de datos local de pruebas (Postgres en el puerto 54329, socket /tmp).
set -euo pipefail
cd "$(dirname "$0")/.."
DB="${PGDATABASE:-carta_test}"
P="psql -h ${PGHOST:-/tmp} -p ${PGPORT:-54329} -U postgres -v ON_ERROR_STOP=1 -q"
$P -c "drop database if exists $DB with (force)" -c "create database $DB" >/dev/null 2>&1
$P -d "$DB" -f tests/supabase-local.sql >/dev/null
for f in supabase/0*.sql; do
  [ "$(basename "$f")" = "002_demo.sql" ] && continue   # la demo solo con --demo
  $P -d "$DB" -f "$f" 2>&1 | grep -v NOTICE || true
done
if [ "${1:-}" = "--demo" ]; then $P -d "$DB" -f supabase/002_demo.sql 2>&1 | grep -o 'clave_admin=.*' || true; fi
echo "BD $DB lista"
