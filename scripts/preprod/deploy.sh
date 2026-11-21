#!/usr/bin/env bash
# ECOM MARKET — déploiement PRÉPRODUCTION isolé sur un VPS Ubuntu 24.04 partagé.
#
# Garanties :
#  - Tout vit sous /var/www/ecom-market-preprod (releases/, shared/, runtime/) ; Node est installé localement.
#  - Utilisateur système, base PostgreSQL, secrets et port dédiés ; écoute sur 127.0.0.1 uniquement.
#  - Nginx : AJOUT d'un seul fichier de site, validé par `nginx -t` puis `reload` (jamais restart).
#  - Certbot ne touche qu'au bloc server de ce domaine.
#  - Aucune commande Docker globale (prune, rm de conteneurs tiers…). Projet compose isolé si DB_MODE=docker.
#  - Sauvegarde de la base avant migration ; rollback automatique si les contrôles échouent.
#  - Aucun secret affiché : ils sont écrits dans shared/.env et shared/credentials.txt (600).
#
# Usage (root) :
#   sudo DOMAIN=preprod.ecommarket.africa LE_EMAIL=vous@exemple.com bash deploy.sh
# Variables : DOMAIN, LE_EMAIL, COMMIT (c79aa2b…), REPO_URL, BRANCH, PORT (auto), DB_MODE (auto|local|docker),
#             BASIC_AUTH (true), SKIP_TLS (false)
set -Eeuo pipefail

APP=ecom-market-preprod
BASE=/var/www/$APP
APP_USER=ecommarket-preprod
DOMAIN="${DOMAIN:-preprod.ecommarket.africa}"
REPO_URL="${REPO_URL:-https://github.com/warrzy/bfmarket.git}"
BRANCH="${BRANCH:-claude/sharp-clarke-pp53h8}"
COMMIT="${COMMIT:-}"            # vide = dernier commit de BRANCH
SOURCE_TARBALL="${SOURCE_TARBALL:-}"   # alternative si le dépôt est privé : archive `git archive`
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_VERSION="${NODE_VERSION:-22.20.0}"
DB_MODE="${DB_MODE:-auto}"
BASIC_AUTH="${BASIC_AUTH:-true}"
SKIP_TLS="${SKIP_TLS:-false}"
DB_NAME=ecom_preprod
DB_USER=ecom_preprod
NGINX_SITE=/etc/nginx/sites-available/$APP
NGINX_LINK=/etc/nginx/sites-enabled/$APP
HTPASSWD=/etc/nginx/$APP.htpasswd
LOG="$BASE/shared/logs/deploy-$(date +%Y%m%d-%H%M%S).log"

say()  { printf '\033[1;34m[ecom-preprod]\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[ecom-preprod] ÉCHEC :\033[0m %s\n' "$*" >&2; exit 1; }
rand() { openssl rand -hex "${1:-24}"; }
[ "$(id -u)" -eq 0 ] || fail "à exécuter en root (sudo)."
grep -q "24.04" /etc/os-release || say "Avertissement : prévu pour Ubuntu 24.04."

mkdir -p "$BASE"/{releases,runtime,shared/{uploads,logs,backups}}
exec > >(tee -a "$LOG") 2>&1
say "Journal : $LOG"

# ───────────── 0. État des autres sites AVANT (pour comparaison) ─────────────
other_sites() {
  [ -d /etc/nginx ] || return 0
  grep -rhoE "server_name[^;]+;" /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null \
    | sed 's/server_name//; s/;//' | tr ' ' '\n' | grep -E '^[a-z0-9.-]+\.[a-z]+$' | grep -v "^$DOMAIN$" | sort -u
}
site_status() {
  for h in $(other_sites); do
    code=$(curl -sk -o /dev/null -m 10 -w '%{http_code}' --resolve "$h:443:127.0.0.1" "https://$h/" || echo 000)
    [ "$code" = 000 ] && code=$(curl -s -o /dev/null -m 10 -w '%{http_code}' --resolve "$h:80:127.0.0.1" "http://$h/" || echo 000)
    echo "$h $code"
  done
}
site_status > "$BASE/shared/logs/other-sites-before.txt" || true
say "Autres sites recensés : $(wc -l < "$BASE/shared/logs/other-sites-before.txt")"

# ───────────── 1. Port libre (127.0.0.1) ─────────────
if [ -z "${PORT:-}" ]; then
  if [ -f "$BASE/shared/.env" ] && grep -q '^PORT=' "$BASE/shared/.env"; then PORT=$(grep '^PORT=' "$BASE/shared/.env" | cut -d= -f2 | tr -d '"')
  else for p in $(seq 3100 3199); do ss -ltn | grep -q ":$p " || { PORT=$p; break; }; done; fi
fi
[ -n "${PORT:-}" ] || fail "aucun port libre entre 3100 et 3199."
say "Port applicatif : 127.0.0.1:$PORT"

# ───────────── 2. Utilisateur système dédié ─────────────
id "$APP_USER" >/dev/null 2>&1 || useradd --system --home "$BASE" --shell /usr/sbin/nologin "$APP_USER"

# ───────────── 3. Node.js local (n'affecte pas un Node global existant) ─────────────
NODE_DIR="$BASE/runtime/node-v$NODE_VERSION"
if [ ! -x "$NODE_DIR/bin/node" ]; then
  say "Installation locale de Node $NODE_VERSION"
  tmp=$(mktemp -d); arch=linux-x64; tgz="node-v$NODE_VERSION-$arch.tar.xz"
  curl -fsSL "https://nodejs.org/dist/v$NODE_VERSION/$tgz" -o "$tmp/$tgz"
  curl -fsSL "https://nodejs.org/dist/v$NODE_VERSION/SHASUMS256.txt" -o "$tmp/SHASUMS256.txt"
  (cd "$tmp" && grep " $tgz\$" SHASUMS256.txt | sha256sum -c -) || fail "somme de contrôle Node invalide."
  mkdir -p "$NODE_DIR" && tar -xJf "$tmp/$tgz" -C "$NODE_DIR" --strip-components=1
fi
export PATH="$NODE_DIR/bin:$PATH"
node -v

# ───────────── 4. Secrets et configuration (créés une seule fois) ─────────────
ENV_FILE="$BASE/shared/.env"
CRED_FILE="$BASE/shared/credentials.txt"
FIRST_DEPLOY=false
if [ ! -f "$ENV_FILE" ]; then
  FIRST_DEPLOY=true
  DB_PASS=$(rand 24)
  cat > "$ENV_FILE" <<EOF
NODE_ENV=production
PORT=$PORT
HOSTNAME=127.0.0.1
APP_URL=https://$DOMAIN
DATABASE_URL=postgresql://$DB_USER:$DB_PASS@127.0.0.1:__DB_PORT__/$DB_NAME?schema=public
SESSION_SECRET=$(rand 32)
CRON_SECRET=$(rand 32)
SITE_NOINDEX=true
STORAGE_DRIVER=local
OTP_DELIVERY=console
OTP_CONSOLE_IN_PRODUCTION=true
OTP_SHOW_ON_SCREEN=true
SUPPORT_WHATSAPP=
CINETPAY_API_KEY=
CINETPAY_SITE_ID=
CINETPAY_SECRET_KEY=
PAYDUNYA_MASTER_KEY=
PAYDUNYA_PRIVATE_KEY=
PAYDUNYA_TOKEN=
SHOP_SUBDOMAINS_ENABLED=false
NEXT_TELEMETRY_DISABLED=1
EOF
  {
    echo "# ECOM MARKET préproduction — identifiants (lisible par root uniquement)"
    echo "SEED_ADMIN_EMAIL=admin@preprod.ecommarket.local"
    echo "SEED_ADMIN_PASSWORD=$(rand 12)"
    echo "SEED_DEMO_PASSWORD=$(rand 10)"
    echo "BASIC_AUTH_USER=recette"
    echo "BASIC_AUTH_PASSWORD=$(rand 10)"
  } > "$CRED_FILE"
fi
chown root:"$APP_USER" "$ENV_FILE"; chmod 640 "$ENV_FILE"; chown root:root "$CRED_FILE"; chmod 600 "$CRED_FILE"
# shellcheck disable=SC1090
set -a; . "$CRED_FILE"; set +a
DB_PASS=$(sed -nE 's#^DATABASE_URL=postgresql://[^:]+:([^@]+)@.*#\1#p' "$ENV_FILE")

# ───────────── 5. Base PostgreSQL dédiée ─────────────
if [ "$DB_MODE" = auto ]; then
  if systemctl is-active --quiet postgresql 2>/dev/null; then DB_MODE=local
  elif command -v docker >/dev/null 2>&1; then DB_MODE=docker
  else fail "ni PostgreSQL local ni Docker : installation d'un SGBD non effectuée automatiquement (choix à valider)."; fi
fi
say "Mode base de données : $DB_MODE"
if [ "$DB_MODE" = local ]; then
  DB_PORT=$(sudo -u postgres psql -Atc "show port")
  sudo -u postgres psql -v ON_ERROR_STOP=1 -q <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$DB_USER') THEN
    CREATE ROLE $DB_USER LOGIN PASSWORD '$DB_PASS';
  END IF;
END \$\$;
SQL
  sudo -u postgres psql -Atc "select 1 from pg_database where datname='$DB_NAME'" | grep -q 1 \
    || sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"
  PG_DUMP=(sudo -u postgres pg_dump -Fc "$DB_NAME")
else
  # Projet compose ISOLÉ (nom propre, volume propre, port lié à 127.0.0.1 uniquement)
  DB_PORT=$(grep -oE '127.0.0.1:[0-9]+/' "$ENV_FILE" | grep -oE '[0-9]+' | tail -1 || true)
  if [ -z "$DB_PORT" ] || [ "$DB_PORT" = "__DB_PORT__" ]; then for p in $(seq 55432 55499); do ss -ltn | grep -q ":$p " || { DB_PORT=$p; break; }; done; fi
  cat > "$BASE/shared/db-compose.yml" <<EOF
name: $APP-db
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment: { POSTGRES_USER: $DB_USER, POSTGRES_PASSWORD: "$DB_PASS", POSTGRES_DB: $DB_NAME }
    ports: ["127.0.0.1:$DB_PORT:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck: { test: ["CMD-SHELL", "pg_isready -U $DB_USER"], interval: 5s, retries: 30 }
volumes:
  pgdata:
EOF
  chmod 600 "$BASE/shared/db-compose.yml"
  docker compose -f "$BASE/shared/db-compose.yml" up -d --wait
  PG_DUMP=(docker compose -f "$BASE/shared/db-compose.yml" exec -T db pg_dump -U "$DB_USER" -Fc "$DB_NAME")
fi
sed -i "s/__DB_PORT__/$DB_PORT/" "$ENV_FILE"
say "Base $DB_NAME prête sur 127.0.0.1:$DB_PORT"

# ───────────── 6. Construction de la release ─────────────
if [ -z "$COMMIT" ] && [ -z "$SOURCE_TARBALL" ]; then
  COMMIT=$(git ls-remote "$REPO_URL" "refs/heads/$BRANCH" | cut -c1-7) || true
  [ -n "$COMMIT" ] || fail "dépôt inaccessible ($REPO_URL). Dépôt privé : REPO_URL avec jeton de lecture, clé de déploiement, ou SOURCE_TARBALL."
fi
[ -n "$SOURCE_TARBALL" ] && COMMIT="${COMMIT:-$(basename "$SOURCE_TARBALL" .tar.gz)}"
REL="$BASE/releases/$COMMIT"
PREV=$(readlink -f "$BASE/current" 2>/dev/null || true)
if [ ! -f "$REL/.built" ]; then
  say "Récupération du commit $COMMIT"
  rm -rf "$REL.tmp"
  if [ -n "$SOURCE_TARBALL" ]; then
    mkdir -p "$REL.tmp" && tar -xzf "$SOURCE_TARBALL" -C "$REL.tmp"
    echo "$COMMIT (archive)" > "$REL.tmp/.commit"
  else
    git clone --quiet --branch "$BRANCH" "$REPO_URL" "$REL.tmp"
    git -C "$REL.tmp" checkout --quiet "$COMMIT"
    git -C "$REL.tmp" rev-parse HEAD > "$REL.tmp/.commit"
  fi
  mv "$REL.tmp" "$REL"
  cd "$REL"
  ln -sfn "$BASE/shared/.env" .env
  rm -rf public/uploads && ln -sfn "$BASE/shared/uploads" public/uploads
  say "Installation des dépendances"
  npm ci --no-audit --no-fund
  say "Construction (peut prendre plusieurs minutes)"
  NODE_OPTIONS="--max-old-space-size=${BUILD_MEM_MB:-1536}" npx next build
  cp -r .next/static .next/standalone/.next/
  cp -r public .next/standalone/ 2>/dev/null || true
  rm -rf .next/standalone/public/uploads && ln -sfn "$BASE/shared/uploads" .next/standalone/public/uploads
  touch "$REL/.built"
fi
cd "$REL"
chown -R "$APP_USER":"$APP_USER" "$BASE/shared/uploads" "$BASE/shared/logs"

# ───────────── 7. Sauvegarde puis migrations (non destructives) ─────────────
# Variables d'exécution chargées seulement maintenant (NODE_ENV=production ne doit pas affecter npm ci)
set -a; . "$ENV_FILE"; set +a
TABLES=$(PGPASSWORD="$DB_PASS" psql -h 127.0.0.1 -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -Atc "select count(*) from information_schema.tables where table_schema='public'" 2>/dev/null || echo 0)
if [ "${TABLES:-0}" != 0 ]; then
  BK="$BASE/shared/backups/pre-deploy-$(date +%Y%m%d-%H%M%S).dump"
  "${PG_DUMP[@]}" > "$BK"; chmod 600 "$BK"; say "Sauvegarde avant migration : $BK"
fi
npx prisma migrate status || true
npx prisma migrate deploy
if [ "$FIRST_DEPLOY" = true ] || [ ! -f "$BASE/shared/.seeded" ]; then
  say "Données de référence + démonstration (préproduction uniquement)"
  SEED_DEMO=true npx tsx prisma/seed.ts | grep -vE "mot de passe|password" || true
  touch "$BASE/shared/.seeded"
fi
chown -R "$APP_USER":"$APP_USER" "$BASE/shared/uploads"

# ───────────── 8. Services systemd ─────────────
cat > /etc/systemd/system/$APP.service <<EOF
[Unit]
Description=ECOM MARKET (préproduction)
After=network-online.target postgresql.service docker.service
Wants=network-online.target

[Service]
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$BASE/current/.next/standalone
EnvironmentFile=$ENV_FILE
ExecStart=$NODE_DIR/bin/node server.js
Restart=always
RestartSec=5
StandardOutput=append:$BASE/shared/logs/app.log
StandardError=append:$BASE/shared/logs/app-error.log
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$BASE/shared/uploads $BASE/shared/logs
MemoryMax=1G

[Install]
WantedBy=multi-user.target
EOF
cat > /etc/systemd/system/$APP-cron.service <<EOF
[Unit]
Description=ECOM MARKET préprod — cycle de vie des abonnements
[Service]
Type=oneshot
EnvironmentFile=$ENV_FILE
ExecStart=/bin/sh -c 'curl -fsS -X POST -H "Authorization: Bearer \$CRON_SECRET" http://127.0.0.1:\$PORT/api/cron/subscriptions'
EOF
cat > /etc/systemd/system/$APP-cron.timer <<EOF
[Unit]
Description=ECOM MARKET préprod — tâche horaire
[Timer]
OnCalendar=hourly
Persistent=true
[Install]
WantedBy=timers.target
EOF
cat > "$BASE/shared/backup.sh" <<EOF
#!/bin/sh
set -e
OUT=$BASE/shared/backups/daily-\$(date +%Y%m%d-%H%M).dump
$(printf '%q ' "${PG_DUMP[@]}") > "\$OUT" && chmod 600 "\$OUT"
find $BASE/shared/backups -name 'daily-*.dump' -mtime +14 -delete
EOF
chmod 700 "$BASE/shared/backup.sh"
cat > /etc/systemd/system/$APP-backup.service <<EOF
[Unit]
Description=ECOM MARKET préprod — sauvegarde quotidienne de la base
[Service]
Type=oneshot
ExecStart=$BASE/shared/backup.sh
EOF
cat > /etc/systemd/system/$APP-backup.timer <<EOF
[Unit]
Description=ECOM MARKET préprod — sauvegarde quotidienne
[Timer]
OnCalendar=*-*-* 03:15:00
Persistent=true
[Install]
WantedBy=timers.target
EOF
cat > /etc/logrotate.d/$APP <<EOF
$BASE/shared/logs/*.log {
  weekly
  rotate 8
  compress
  missingok
  notifempty
  copytruncate
}
EOF

ln -sfn "$REL" "$BASE/current"
systemctl daemon-reload
systemctl enable --now "$APP-cron.timer" "$APP-backup.timer" >/dev/null
systemctl enable "$APP.service" >/dev/null
systemctl restart "$APP.service"

rollback() {
  say "ROLLBACK : $1"
  if [ -n "$PREV" ] && [ -d "$PREV" ] && [ "$PREV" != "$REL" ]; then
    ln -sfn "$PREV" "$BASE/current"; systemctl restart "$APP.service"; say "Release précédente restaurée : $PREV"
  else
    systemctl stop "$APP.service" || true; say "Premier déploiement : service arrêté."
  fi
  exit 1
}

# ───────────── 9. Contrôle applicatif local ─────────────
for i in $(seq 1 30); do curl -fsS -m 3 "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1 && break; sleep 2; done
curl -fsS -m 5 "http://127.0.0.1:$PORT/api/health" >/dev/null || rollback "l'application ne répond pas sur /api/health"
say "Application en ligne sur 127.0.0.1:$PORT"

# ───────────── 10. Nginx (ajout d'un site, validé avant reload) ─────────────
if ! command -v nginx >/dev/null 2>&1; then
  say "Nginx absent : reverse proxy NON configuré (aucun serveur web installé automatiquement)."
  say "Accès temporaire sécurisé : ssh -L $PORT:127.0.0.1:$PORT <utilisateur>@<vps>  puis http://localhost:$PORT"
else
  if grep -rqsE "server_name[^;]*\b$DOMAIN\b" /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null && [ ! -e "$NGINX_LINK" ]; then
    rollback "$DOMAIN est déjà déclaré dans une autre configuration Nginx — rien modifié."
  fi
  if [ "$BASIC_AUTH" = true ]; then
    printf '%s:%s\n' "$BASIC_AUTH_USER" "$(openssl passwd -apr1 "$BASIC_AUTH_PASSWORD")" > "$HTPASSWD"
    chown root:www-data "$HTPASSWD"; chmod 640 "$HTPASSWD"
    AUTH_LINES="auth_basic \"ECOM MARKET - recette\"; auth_basic_user_file $HTPASSWD;"
  else AUTH_LINES=""; fi
  NGINX_BACKUP=""
  [ -f "$NGINX_SITE" ] && { NGINX_BACKUP="$NGINX_SITE.bak.$(date +%s)"; cp "$NGINX_SITE" "$NGINX_BACKUP"; }
  # Ne réécrit pas un bloc déjà enrichi par certbot (HTTPS) : seul le premier déploiement crée le fichier.
  if [ ! -f "$NGINX_SITE" ] || ! grep -q "managed by Certbot" "$NGINX_SITE"; then
    cat > "$NGINX_SITE" <<EOF
# ECOM MARKET préproduction — fichier géré par scripts/preprod/deploy.sh
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    client_max_body_size 40m;
    add_header X-Robots-Tag "noindex, nofollow, noarchive" always;
    $AUTH_LINES

    location = /robots.txt {
        auth_basic off;
        default_type text/plain;
        return 200 "User-agent: *\nDisallow: /\n";
    }

    location /api/webhooks/ {
        auth_basic off;
        proxy_pass http://127.0.0.1:$PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    location /_next/static/ {
        proxy_pass http://127.0.0.1:$PORT;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 60s;
    }
}
EOF
  fi
  ln -sfn "$NGINX_SITE" "$NGINX_LINK"
  if ! nginx -t >/dev/null 2>&1; then
    nginx -t || true
    if [ -n "$NGINX_BACKUP" ]; then cp "$NGINX_BACKUP" "$NGINX_SITE"; else rm -f "$NGINX_LINK" "$NGINX_SITE"; fi
    rollback "configuration Nginx invalide — fichier ECOM MARKET retiré, Nginx non rechargé."
  fi
  systemctl reload nginx
  say "Nginx rechargé (reload) avec le site $DOMAIN"

  # ───────────── 11. HTTPS (uniquement si le DNS pointe vers ce VPS) ─────────────
  PUBLIC_IP=$(curl -4 -s -m 8 https://api.ipify.org || true)
  RESOLVED=$(getent ahostsv4 "$DOMAIN" | awk '{print $1}' | sort -u | tr '\n' ' ')
  if [ "$SKIP_TLS" = true ]; then say "HTTPS ignoré (SKIP_TLS=true)."
  elif [ -z "$PUBLIC_IP" ] || ! echo "$RESOLVED" | grep -qw "$PUBLIC_IP"; then
    say "DNS : $DOMAIN → '${RESOLVED:-aucune résolution}', VPS = ${PUBLIC_IP:-?}. Certificat NON demandé."
    say "Créez un enregistrement A '$DOMAIN' → ${PUBLIC_IP:-<IP du VPS>} puis relancez ce script."
  elif ! command -v certbot >/dev/null 2>&1; then
    say "certbot absent : HTTPS non configuré (installation : apt install certbot python3-certbot-nginx, à valider)."
  else
    [ -n "${LE_EMAIL:-}" ] || fail "LE_EMAIL requis pour Let's Encrypt."
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$LE_EMAIL" --redirect --keep-until-expiring \
      || say "certbot a échoué (voir ci-dessus) — le site reste en HTTP."
    nginx -t && systemctl reload nginx
  fi
fi

# ───────────── 12. Contrôles post-déploiement ─────────────
SMOKE_LOCAL=1 bash "$SCRIPT_DIR/smoke.sh" "http://127.0.0.1:$PORT" || rollback "contrôles post-déploiement en échec"

site_status > "$BASE/shared/logs/other-sites-after.txt" || true
if ! diff -q "$BASE/shared/logs/other-sites-before.txt" "$BASE/shared/logs/other-sites-after.txt" >/dev/null; then
  say "ATTENTION : l'état HTTP d'autres sites a changé :"; diff "$BASE/shared/logs/other-sites-before.txt" "$BASE/shared/logs/other-sites-after.txt" || true
else say "Autres sites : état HTTP inchangé."; fi

# Nettoyage : conserve les 3 dernières releases
ls -1dt "$BASE"/releases/*/ 2>/dev/null | tail -n +4 | while read -r old; do [ "$(readlink -f "$BASE/current")/" = "$old" ] || rm -rf "$old"; done

say "Déploiement terminé : commit $(cat "$REL/.commit"), service $APP actif, port $PORT."
say "Identifiants (admin, démo, accès recette) : sudo cat $CRED_FILE"
