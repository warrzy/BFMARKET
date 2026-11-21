# Déploiement (VPS + Docker Compose)

Prérequis : un serveur Linux (2 vCPU / 4 Go conseillés au lancement), Docker, un nom de domaine pointant vers le serveur (et `media.<domaine>` pour les médias).

```bash
git clone <dépôt> ecom-market && cd ecom-market
cp .env.example .env
```

Variables à renseigner dans `.env` (en plus de celles de `.env.example`) :

```
DOMAIN=ecommarket.africa
MEDIA_DOMAIN=media.ecommarket.africa
APP_URL=https://ecommarket.africa
POSTGRES_PASSWORD=<fort>
SESSION_SECRET=<openssl rand -hex 32>
CRON_SECRET=<openssl rand -hex 32>
S3_ACCESS_KEY=<identifiant MinIO>
S3_SECRET_KEY=<secret MinIO>
S3_BUCKET=ecom-media
S3_PUBLIC_URL=https://media.ecommarket.africa/ecom-media
OTP_DELIVERY=webhook
OTP_WEBHOOK_URL=<votre passerelle SMS>
SUPPORT_WHATSAPP=226XXXXXXXX
```

```bash
docker compose up -d --build
# Première installation : données de référence (sans démo)
docker compose run --rm -e SEED_DEMO=false -e SEED_ADMIN_EMAIL=vous@domaine -e SEED_ADMIN_PASSWORD='<fort>' migrate npx tsx prisma/seed.ts
```

Créer le bucket `ecom-media` dans MinIO (console sur le port 9001, accès via tunnel SSH) avec une politique de lecture publique.

Services : `app` (Next.js standalone), `db` (PostgreSQL 16), `redis`, `minio`, `caddy` (HTTPS Let's Encrypt automatique), `migrate` (migrations à chaque déploiement), `cron` (cycle de vie des abonnements, horaire), `backup` (pg_dump quotidien dans `./backups`, à copier hors serveur).

Mise à jour : `git pull && docker compose up -d --build`. Restauration : `./deploy/restore.sh backups/<fichier>.dump`.

Suivi : `GET /api/health` (utilisé par le healthcheck Docker).
