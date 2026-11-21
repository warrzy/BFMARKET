#!/usr/bin/env bash
# ECOM MARKET préprod — retour à la release précédente (ou à un commit donné).
# Usage : sudo bash rollback.sh                → release précédente
#         sudo bash rollback.sh <commit>        → release releases/<commit>
#         sudo RESTORE_DB=<fichier.dump> bash rollback.sh   → restaure aussi la base (sauvegarde préalable automatique)
set -Eeuo pipefail
APP=ecom-market-preprod; BASE=/var/www/$APP
[ "$(id -u)" -eq 0 ] || { echo "root requis"; exit 1; }
CUR=$(readlink -f "$BASE/current")
if [ -n "${1:-}" ]; then TARGET="$BASE/releases/$1"
else TARGET=$(ls -1dt "$BASE"/releases/*/ | sed 's#/$##' | grep -vx "$CUR" | head -1); fi
[ -f "$TARGET/.built" ] || { echo "Release introuvable ou incomplète : $TARGET"; exit 1; }

if [ -n "${RESTORE_DB:-}" ]; then
  [ -f "$RESTORE_DB" ] || { echo "Sauvegarde introuvable"; exit 1; }
  "$BASE/shared/backup.sh"   # sauvegarde de l'état actuel avant restauration
  set -a; . "$BASE/shared/.env"; set +a
  pg_restore --clean --if-exists --no-owner -d "${DATABASE_URL%%\?*}" "$RESTORE_DB"
  echo "Base restaurée depuis $RESTORE_DB"
fi

ln -sfn "$TARGET" "$BASE/current"
systemctl restart "$APP.service"
PORT=$(grep '^PORT=' "$BASE/shared/.env" | cut -d= -f2)
for i in $(seq 1 30); do curl -fsS -m 3 "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1 && break; sleep 2; done
curl -fsS -m 5 "http://127.0.0.1:$PORT/api/health" >/dev/null && echo "Rollback OK : $(cat "$TARGET/.commit")" || { echo "Rollback : l'application ne répond pas"; exit 1; }
