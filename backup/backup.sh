#!/usr/bin/env bash
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DUMP_FILE="${BACKUP_DIR}/mirai_kojin_${TIMESTAMP}.sql.gz"
ENCRYPTED_FILE="${DUMP_FILE}.enc"

if [ -z "${BACKUP_ENCRYPTION_KEY:-}" ]; then
  echo "ERROR: BACKUP_ENCRYPTION_KEY is not set" >&2
  exit 1
fi

echo "[$(date)] Starting database backup..."

# Dump and compress
pg_dump \
  -h "${PGHOST}" \
  -U "${PGUSER}" \
  -d "${PGDATABASE}" \
  --format=custom \
  --compress=9 \
  -f "${DUMP_FILE}"

# Encrypt with AES-256-GCM
openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 \
  -in "${DUMP_FILE}" \
  -out "${ENCRYPTED_FILE}" \
  -pass env:BACKUP_ENCRYPTION_KEY

# Remove unencrypted dump
rm -f "${DUMP_FILE}"

echo "[$(date)] Backup saved: ${ENCRYPTED_FILE}"

# Clean up old backups
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
echo "[$(date)] Removing backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "*.enc" -type f -mtime "+${RETENTION_DAYS}" -delete

echo "[$(date)] Backup completed successfully."
