#!/usr/bin/env sh
# Restauration d'une sauvegarde : ./deploy/restore.sh backups/ecom-2026-11-21-0300.dump
# À tester régulièrement sur un environnement de préproduction.
set -eu
FILE="$1"
docker compose exec -T db sh -c 'pg_restore -U "${POSTGRES_USER:-ecom}" -d "${POSTGRES_DB:-ecom}" --clean --if-exists --no-owner' < "$FILE"
echo "Restauration terminée depuis $FILE"
