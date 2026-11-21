# ECOM MARKET

Marketplace multi-vendeurs pour l'Afrique de l'Ouest — « Toute l'Afrique de l'Ouest, un seul marché. »

Chaque commerçant ouvre gratuitement sa boutique (URL dédiée, catalogue, commandes, WhatsApp, QR code, statistiques) ; les acheteurs cherchent dans toute la marketplace par pays, ville et catégorie. Lancement prioritaire au Burkina Faso, 15 pays prévus et activables depuis l'administration. Modèle SaaS sans commission sur les ventes.

- Analyse de la référence : [`REFERENCE_ANALYSIS.md`](REFERENCE_ANALYSIS.md)
- Architecture : [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Sécurité : [`docs/SECURITE.md`](docs/SECURITE.md)
- Déploiement : [`docs/DEPLOIEMENT.md`](docs/DEPLOIEMENT.md)
- État d'avancement et suite : [`docs/ROADMAP.md`](docs/ROADMAP.md)

## Stack

Next.js 15 (App Router, Server Actions) · TypeScript · Tailwind CSS · PostgreSQL 16 · Prisma 6 · stockage S3 (MinIO, ou disque local en dev) · Docker + Caddy (HTTPS automatique) · Vitest + Playwright · GitHub Actions.

## Démarrage local

Prérequis : Node 22, PostgreSQL 16.

```bash
cp .env.example .env        # renseigner DATABASE_URL et SESSION_SECRET
npm install
npx prisma migrate deploy
SEED_ADMIN_PASSWORD=changez-moi npm run db:seed   # pays, villes, catégories, offres, prestataires + données de démo
npm run dev
```

Comptes créés par le seed (développement) :

| Rôle | Identifiant | Mot de passe |
|---|---|---|
| Super administrateur | `admin@ecommarket.local` (ou `SEED_ADMIN_EMAIL`) | `SEED_ADMIN_PASSWORD`, sinon généré et affiché une fois |
| Vendeurs de démo | `demo+<slug-boutique>@ecommarket.local` (ex. `demo+ouaga-tech-store@ecommarket.local`) | `demo-vendeur-2026` (ou `SEED_DEMO_PASSWORD`) |

Les données de démonstration (7 boutiques fictives, visuels générés) sont désactivées en production (`SEED_DEMO=false`). Aucun avis client n'est généré.

En développement, le code de vérification (OTP) s'affiche à l'écran et dans la console du serveur.

## Tests

```bash
npm run lint && npm run typecheck
npm test                     # tests unitaires (règles de prix, paiements, abonnements, import…)
npm run test:integration     # base de données requise : webhooks idempotents, écarts de montant…
npm run build && npx playwright test   # parcours E2E sur mobile émulé
```

Les 6 parcours E2E couvrent : achat invité de bout en bout, confirmation de commande et validation d'encaissement par le vendeur, isolation entre vendeurs, création de boutique en 6 étapes, vérification de boutique par l'admin (journalisée), protection des espaces privés.

## Structure

```
prisma/              schéma, migrations, seed (pays, villes, catégories, offres)
src/app/(site)       marketplace publique (accueil, catalogue, fiches, boutiques, panier, suivi)
src/app/(auth)       inscription, connexion, vérification
src/app/vendeur      tableau de bord vendeur (12 rubriques)
src/app/admin        back-office multi-pays
src/app/actions      Server Actions (toutes vérifient rôle et périmètre côté serveur)
src/app/api          webhooks paiement, tâche planifiée, QR code, exports, santé
src/server/modules   modules métier : orders, payments, subscriptions, catalog, shops, notifications, ai
src/i18n             FR / EN (ajout d'une langue = un fichier)
e2e/, tests/         Playwright, Vitest
deploy/, Dockerfile  Caddy, sauvegarde/restauration, image de production
```
