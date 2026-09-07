#!/usr/bin/env bash
# Sincroniza /root/master/Septiembre-04/frontend → /var/www/frontend
# y reinicia el backend.
set -euo pipefail

REPO_DIR="${REPO_DIR:-/root/master/Septiembre-04}"
SRC="${REPO_DIR}/frontend"
DST="${DST:-/var/www/frontend}"
OWNER="${OWNER:-www-data:www-data}"

echo "== Actualizando repo =="
cd "${REPO_DIR}"
git fetch origin
git reset --hard origin/main

echo "== Sincronizando frontend con rsync =="
sudo rsync -a --delete \
  --exclude='.git' \
  --exclude='.well-known' \
  --exclude='node_modules' \
  "${SRC}/" "${DST}/"

echo "== Ajustando permisos =="
sudo chown -R "${OWNER}" "${DST}"
sudo find "${DST}" -type d -exec chmod 755 {} \;
sudo find "${DST}" -type f -exec chmod 644 {} \;

echo "== Reiniciando backend =="
cd "${REPO_DIR}/backend"
# shellcheck disable=SC1091
source .venv/bin/activate

pkill -f "uvicorn.*app:app" || true

nohup python -m uvicorn app:app \
  --host 127.0.0.1 \
  --port 8000 \
  > backend.log 2>&1 &

sleep 3
curl -fs http://127.0.0.1:8000/health || {
  echo "ERROR: /health no responde"
  tail -30 backend.log
  exit 1
}

echo "OK"
