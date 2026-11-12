#!/usr/bin/env bash
# Despliegue SICOP: actualiza código, reconstruye y verifica salud.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> git pull"
git pull --ff-only

echo "==> docker compose up --build -d"
docker compose up --build -d

echo "==> verificando /api/salud"
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:8080/api/salud >/dev/null 2>&1; then
    echo "OK: API saludable"; curl -s http://127.0.0.1:8080/api/salud; echo
    break
  fi
  [ "$i" -eq 30 ] && { echo "ERROR: /api/salud no responde"; docker compose logs --tail=50 api; exit 1; }
  sleep 2
done

docker compose ps
