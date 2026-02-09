#!/usr/bin/env bash
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <encrypted_backup_file>" >&2
  exit 1
fi

ENCRYPTED_FILE="$1"

if [ ! -f "${ENCRYPTED_FILE}" ]; then
  echo "ERROR: Backup file not found: ${ENCRYPTED_FILE}" >&2
  exit 1
fi

if [ -z "${BACKUP_ENCRYPTION_KEY:-}" ]; then
  echo "ERROR: BACKUP_ENCRYPTION_KEY is not set" >&2
  exit 1
fi

DECRYPTED_FILE="${ENCRYPTED_FILE%.enc}"

echo "[$(date)] Decrypting backup: ${ENCRYPTED_FILE}..."

# Decrypt
openssl enc -aes-256-cbc -d -salt -pbkdf2 -iter 100000 \
  -in "${ENCRYPTED_FILE}" \
  -out "${DECRYPTED_FILE}" \
  -pass env:BACKUP_ENCRYPTION_KEY

echo "[$(date)] Restoring database..."

# Restore
pg_restore \
  -h "${PGHOST}" \
  -U "${PGUSER}" \
  -d "${PGDATABASE}" \
  --clean \
  --if-exists \
  "${DECRYPTED_FILE}"

# Remove decrypted dump
rm -f "${DECRYPTED_FILE}"

echo "[$(date)] Restore completed successfully."
