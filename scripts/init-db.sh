#!/usr/bin/env bash
set -euo pipefail

# PostgreSQL initialization script
# Enables pgcrypto extension and creates application user

POSTGRES_USER="${POSTGRES_USER:-mirai}"
POSTGRES_DB="${POSTGRES_DB:-mirai_kojin}"

echo "[$(date)] Initializing database..."

# Wait for PostgreSQL to be ready
until pg_isready -h db -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" 2>/dev/null; do
  echo "Waiting for PostgreSQL..."
  sleep 2
done

# Enable pgcrypto extension
psql -h db -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"

echo "[$(date)] Database initialization completed."
