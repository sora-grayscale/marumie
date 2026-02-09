#!/usr/bin/env bash
set -euo pipefail

# Generate self-signed SSL certificates for PostgreSQL

CERT_DIR="$(cd "$(dirname "$0")/../db/ssl" && pwd)"

if [ -f "${CERT_DIR}/server.crt" ] && [ -f "${CERT_DIR}/server.key" ]; then
  echo "SSL certificates already exist in ${CERT_DIR}"
  echo "To regenerate, delete the existing files first."
  exit 0
fi

echo "Generating self-signed SSL certificates..."

openssl req -new -x509 -days 3650 -nodes \
  -out "${CERT_DIR}/server.crt" \
  -keyout "${CERT_DIR}/server.key" \
  -subj "/CN=mirai-kojin-db/O=mirai-kojin/C=JP"

# PostgreSQL requires the key file to have restricted permissions
chmod 600 "${CERT_DIR}/server.key"
chmod 644 "${CERT_DIR}/server.crt"

echo "SSL certificates generated:"
echo "  Certificate: ${CERT_DIR}/server.crt"
echo "  Private key: ${CERT_DIR}/server.key"
