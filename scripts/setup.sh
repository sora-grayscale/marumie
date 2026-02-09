#!/usr/bin/env bash
set -euo pipefail

# Initial setup script for mirai-kojin

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "=== mirai-kojin Initial Setup ==="
echo ""

# Step 1: Check prerequisites
echo "[1/5] Checking prerequisites..."
for cmd in podman podman-compose openssl; do
  if ! command -v "${cmd}" &>/dev/null; then
    echo "ERROR: ${cmd} is required but not installed." >&2
    exit 1
  fi
done
echo "  All prerequisites found."

# Step 2: Create .env from template if not exists
if [ ! -f "${PROJECT_DIR}/.env" ]; then
  echo "[2/5] Creating .env from .env.example..."
  cp "${PROJECT_DIR}/.env.example" "${PROJECT_DIR}/.env"
  echo "  .env created. Please review and update the values."
else
  echo "[2/5] .env already exists, skipping."
fi

# Step 3: Generate SSL certificates
echo "[3/5] Generating SSL certificates..."
bash "${SCRIPT_DIR}/generate-certs.sh"

# Step 4: Start database
echo "[4/5] Starting database..."
cd "${PROJECT_DIR}"
podman-compose up -d db
echo "  Waiting for database to be healthy..."
sleep 5

until podman-compose exec db pg_isready -U "${POSTGRES_USER:-mirai}" -d "${POSTGRES_DB:-mirai_kojin}" 2>/dev/null; do
  echo "  Waiting for PostgreSQL..."
  sleep 2
done
echo "  Database is ready."

# Step 5: Start all services
echo "[5/5] Starting all services..."
podman-compose up -d

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Services:"
echo "  Frontend: http://localhost:3000"
echo "  API:      http://localhost:8080"
echo "  Database: localhost:5432"
echo ""
echo "To view logs: podman-compose logs -f"
echo "To stop:      podman-compose down"
