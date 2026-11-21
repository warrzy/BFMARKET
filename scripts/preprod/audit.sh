#!/usr/bin/env bash
# ECOM MARKET — audit du VPS AVANT déploiement. STRICTEMENT EN LECTURE SEULE :
# aucune installation, aucune modification, aucun redémarrage.
# Usage (sur le VPS, en root ou sudo) : sudo bash audit.sh [preprod.ecommarket.africa] > audit.txt
set -u
DOMAIN="${1:-preprod.ecommarket.africa}"
hr() { printf '\n==================== %s ====================\n' "$1"; }
have() { command -v "$1" >/dev/null 2>&1; }

hr "SYSTÈME"
uname -a; . /etc/os-release 2>/dev/null && echo "OS: $PRETTY_NAME"; uptime

hr "RESSOURCES"
nproc; free -h; df -h -x tmpfs -x devtmpfs; swapon --show 2>/dev/null

hr "PORTS EN ÉCOUTE"
ss -ltnp 2>/dev/null | sort -k4

hr "SERVICES SYSTEMD ACTIFS (hors système de base)"
systemctl list-units --type=service --state=running --no-pager --no-legend 2>/dev/null \
  | grep -vE "systemd-|dbus|cron|ssh|getty|polkit|rsyslog|snapd|udisks|unattended|multipathd|networkd|resolved|timesyncd|qemu|serial|user@|ModemManager|packagekit|fwupd|irqbalance|upower|accounts-daemon|apparmor|blk-availability|lvm|chrony|atd" || true

hr "NGINX"
if have nginx; then
  nginx -v 2>&1; systemctl is-active nginx 2>/dev/null
  echo "-- Sites activés :"; ls -la /etc/nginx/sites-enabled/ 2>/dev/null; ls /etc/nginx/conf.d/ 2>/dev/null
  echo "-- server_name déclarés :"; grep -rhoE "server_name[^;]+;" /etc/nginx/ 2>/dev/null | sort -u
  echo "-- proxy_pass déclarés :"; grep -rhoE "proxy_pass[^;]+;" /etc/nginx/ 2>/dev/null | sort -u
  echo "-- Test de configuration (lecture) :"; nginx -t 2>&1 | tail -2
else echo "nginx absent"; fi
for s in apache2 caddy traefik haproxy; do systemctl is-active "$s" >/dev/null 2>&1 && echo "ATTENTION : $s actif"; done

hr "CERTIFICATS SSL"
if have certbot; then certbot certificates 2>/dev/null | grep -E "Certificate Name|Domains|Expiry" ; else ls /etc/letsencrypt/live 2>/dev/null || echo "certbot absent"; fi

hr "DOCKER"
if have docker; then
  docker version --format 'Docker {{.Server.Version}}' 2>/dev/null
  docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null
  echo "-- Projets compose :"; docker compose ls 2>/dev/null
  echo "-- Réseaux :"; docker network ls --format '{{.Name}}' 2>/dev/null | tr '\n' ' '; echo
else echo "docker absent"; fi

hr "BASES DE DONNÉES"
if have psql; then psql --version; systemctl is-active postgresql 2>/dev/null
  sudo -u postgres psql -Atc "select datname from pg_database where not datistemplate" 2>/dev/null | sed 's/^/  base: /'
  sudo -u postgres psql -Atc "select rolname from pg_roles where rolcanlogin" 2>/dev/null | sed 's/^/  rôle: /'
else echo "PostgreSQL client absent"; fi
for s in mysql mariadb mongod redis-server redis; do systemctl is-active "$s" >/dev/null 2>&1 && echo "actif : $s"; done

hr "NODE / PM2"
have node && node -v || echo "node global absent"
have pm2 && pm2 ls 2>/dev/null || echo "pm2 absent"

hr "RÉPERTOIRES D'APPLICATIONS"
ls -la /var/www 2>/dev/null; ls /opt 2>/dev/null; ls /srv 2>/dev/null
[ -e /var/www/ecom-market-preprod ] && echo "ATTENTION : /var/www/ecom-market-preprod existe déjà" || echo "/var/www/ecom-market-preprod : libre"

hr "PARE-FEU"
have ufw && ufw status 2>/dev/null | head -20

hr "DNS DU DOMAINE CIBLE : $DOMAIN"
PUBLIC_IP="$(curl -4 -s -m 8 https://api.ipify.org || true)"
echo "IP publique du VPS : ${PUBLIC_IP:-inconnue}"
RES="$(getent ahostsv4 "$DOMAIN" | awk '{print $1}' | sort -u | tr '\n' ' ')"
echo "$DOMAIN → ${RES:-NE RÉSOUT PAS}"
if [ -n "$PUBLIC_IP" ] && echo "$RES" | grep -qw "$PUBLIC_IP"; then echo "OK : le domaine pointe vers ce VPS"; else echo "NON : le domaine ne pointe pas (encore) vers ce VPS"; fi
have whois && whois "${DOMAIN#*.}" 2>/dev/null | grep -iE "registrar:|registrant|expir" | head -5

hr "PORTS CANDIDATS POUR ECOM MARKET (127.0.0.1)"
for p in 3100 3101 3102 3103 3104 3105; do ss -ltn | grep -q ":$p " && echo "$p occupé" || echo "$p libre"; done
echo; echo "Audit terminé — aucune modification effectuée."
