# Architecture

## Choix : monolithe modulaire

Une seule application Next.js (rendu serveur + Server Actions + routes API) découpée en modules métier dans `src/server/modules`. Pas de microservices à ce stade : une équipe réduite, un déploiement simple sur un VPS, et des frontières de modules qui permettront d'extraire un service plus tard si la charge l'exige.

| Module | Rôle | Fichiers clés |
|---|---|---|
| Authentification | Comptes téléphone/e-mail, sessions en base, OTP, rôles | `src/server/auth/*`, `src/app/actions/auth.ts` |
| Catalogue | Produits, variantes, catégories à attributs, recherche, import/export | `modules/catalog/*` |
| Boutiques | Création, slug, sections, livraison, statistiques de visites | `modules/shops/*` |
| Commandes | Panier → commande → **une sous-commande par boutique**, machine à états | `modules/orders/*` |
| Paiements | `PaymentProviderInterface`, registre, webhooks idempotents | `modules/payments/*` |
| Abonnements | Offres configurables, droits, essai, coupons, cycle de vie | `modules/subscriptions/*` |
| Notifications | In-app + canal sortant pluggable (SMS/e-mail via webhook) | `modules/notifications/*` |
| Recherche | Requêtes PostgreSQL (filtres pays/ville/catégorie/prix/onglets) | `modules/catalog/queries.ts` |
| Administration | Back-office, rôles, périmètre pays, journal d'audit | `src/app/admin`, `actions/admin.ts` |

## Multi-tenant

Isolation logique : toutes les ressources vendeur portent `shopId`. Chaque action vendeur passe par `requireShop()` (`src/server/auth/guards.ts`) qui résout la boutique **depuis la session**, puis filtre systématiquement par `shopId` (`findFirst({ where: { id, shopId } })`, `updateMany({ where: { id, shopId } })`). Un identifiant d'une autre boutique renvoie 404 — vérifié par le test E2E « isolation ». Les administrateurs locaux (`COUNTRY_ADMIN`) sont limités à `adminCountries`.

## Commandes et paiements

- Le client n'envoie que des identifiants et quantités ; prix, promotions, stocks et frais sont recalculés côté serveur (`pricing.ts`).
- Le stock est décrémenté par mise à jour conditionnelle (`stock >= quantité`) dans la transaction, et restitué en cas d'annulation ou de retour.
- Statuts de paiement : `UNPAID → DECLARED (client) → PAID (vendeur/admin/prestataire vérifié)`. Le client ne peut que **déclarer** ; rien ne passe à `PAID` automatiquement sans validation humaine tracée ou vérification serveur auprès du prestataire (`state.ts`).
- Prestataires : hors ligne (`direct`, `cod`, `manual`) actifs dès le lancement ; `cinetpay` et `paydunya` implémentés d'après leurs API publiques, **désactivés** tant que contrats et clés ne sont pas fournis, et à valider en environnement de test.
- Webhooks : enregistrés dans `WebhookEvent` (clé unique par prestataire → idempotence), puis **revérification** du statut par appel au prestataire, contrôle du montant et de la devise (un écart bloque `PAID` et est journalisé).
- La plateforme ne détient pas les fonds des ventes ; le modèle `Payout` n'est pas activé (montage réglementaire requis).

## Abonnements

Offres `FREE / PRO / BUSINESS` en base ; droits en JSON (`maxProducts`, `promotions`, `ai`, `import`, `staffAccounts`…), prix par pays et devise (`PlanPrice`). Rien n'est figé dans le code. Cycle de vie (tâche horaire `/api/cron/subscriptions`) : rappel J-3, période de grâce de 7 jours (`PAST_DUE`), puis retour aux droits gratuits (`RESTRICTED`). Les paiements d'abonnement passent par validation manuelle admin tant qu'aucun prestataire en ligne n'est actif.

## Géolocalisation, devises, langues

- Pays/villes en base, activables. Choix manuel mémorisé en cookie ; « me localiser » uniquement après consentement du navigateur (suggestion de la ville la plus proche, position non conservée).
- Prix stockés en entiers dans la devise du vendeur ; **aucune conversion** entre devises.
- i18n FR/EN par dictionnaires typés (`src/i18n`) ; ajouter une langue = un fichier.

## Performance (réseaux limités)

Rendu serveur, peu de JavaScript client (cartes produit sans JS), images réencodées en WebP redimensionnées à l'upload puis servies via `next/image` (AVIF/WebP), pagination par curseur, skeletons sur les pages catalogue, cache immuable des assets via Caddy. La capacité de montée en charge n'est **pas** garantie avant tests de charge (voir ROADMAP).

## Évolutions préparées

Sous-domaines boutiques (`src/middleware.ts`, `SHOP_SUBDOMAINS_ENABLED`), recherche externe (Meilisearch/OpenSearch derrière `searchProducts`), Redis (variable `REDIS_URL` ; la limitation de débit fonctionne déjà en base), WhatsApp Business API officielle (point d'extension dans `notifications`).
