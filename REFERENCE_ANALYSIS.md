# REFERENCE_ANALYSIS — MFB Market → ECOM MARKET

Analyse réalisée le 21/11/2026 à partir des pages publiques suivantes, téléchargées en HTTP (sans connexion, sans exécution de compte) :

| Source | Statut | Ce qui a pu être observé |
|---|---|---|
| `https://www.mfbservices97.online/marketplace/` | ✅ 200 | HTML + scripts de la marketplace (application rendue côté client), libellés d'interface, appels `fetch` vers l'API publique |
| `https://www.mfbservices97.online/vendre-en-ligne` | ✅ 200 | Page d'acquisition vendeurs (texte complet) |
| `https://yvano-store.mfbservices97.online/a-propos/` | ✅ 200 | Page « À propos » (modèle économique, FAQ, règles de confiance) |
| API publiques en lecture (`/api/parametres`, `/api/marketplace`, `/api/marketplace-aleatoire`, `/api/marketplace-produits?q=`, `/api/villes?pays=`) | ✅ 200 | Forme des données : pays, villes, boutiques, produits |
| Vidéo Facebook `share/v/1F2qBT9BsD` | ⚠️ partiel | Seules les métadonnées (titre/description) sont accessibles sans connexion. **Le contenu vidéo n'a pas été visionné.** |
| Espace vendeur (`/vendeurs1/dashboard`), inscription | ⛔ non exploré | Nécessite un compte ; formulaire d'inscription non soumis. Fonctionnalités supposées marquées **[H]** |
| Rendu visuel desktop / mobile | ⚠️ partiel | Pas de capture navigateur effectuée ; structure déduite du HTML/CSS (PWA, mode sombre, bascule FR/EN). |

> Aucun logo, image, texte propriétaire ni code source de MFB Market n'a été copié dans ECOM MARKET. Les libellés ci-dessous sont cités uniquement à des fins d'analyse.

## Observations clés

1. **Architecture produit** : une marketplace centrale qui agrège des boutiques ; chaque boutique vit sur un **sous-domaine** (`<slug>.mfbservices97.online`) avec ses pages produit (`/produit?p=<id>`), et un paramètre de traçage `mfb_ref=marketplace` sur les liens sortants.
2. **Pays** : la liste renvoyée par l'API contient code ISO, drapeau, indicatif, devise, longueur et préfixes valides des numéros (validation téléphonique par pays). Elle inclut aussi des pays d'Afrique centrale (CM, GA, CD) et des prix en XAF/USD.
3. **Villes** : liste fermée par pays avec option « autre » (`"autre": true`).
4. **Filtres marketplace** : « Livraison depuis » pays + ville, onglets **Tous / Premium / Promos / Nouveautés / Près de moi / Ventes flash**, recherche (min. 2 caractères), catégories, « Vu récemment », « Coups de cœur », chargement infini.
5. **Produit (API)** : `nom, prix, devise, prixPromo, type (physique/numérique), image, desc (HTML), categorie, stockBas/stockQty, promoFin, boutique{nom, slug, logo, ville, paysFlag, premium, whatsappContact}`.
6. **Panier + commande** dans la marketplace (`/api/panier`, `/api/commande`) ; commande reçue par le vendeur avec nom, numéro et adresse du client ; livraison organisée directement entre vendeur et client.
7. **Modèle économique** : abonnement mensuel fixe, **0 % de commission** ; « Premium » = boutiques payantes mises en avant ; programme **agences & développeurs** commissionnés sur les abonnements des boutiques qu'ils créent ; offres annexes (formation dropshipping, import Chine).
8. **Paiements** : mobile money via « partenaire agréé » pour les **produits numériques** (livraison automatique après paiement) ; produits physiques réglés hors plateforme ; **retraits** vérifiés et plafonnés au solde gagné.
9. **Confiance** : vendeurs identifiés (numéro + boutique confirmés avant mise en avant), ville du vendeur affichée sur chaque fiche.
10. **Acquisition** : PWA installable, bannières d'installation, pixels publicitaires, suivi de clics de parrainage (`/api/ref-clic`), compte à rebours marketing sur la page vendeur, vidéo virale (368 K vues) axée « zéro commission / plus de pub Facebook ».

## Matrice comparative

Légende fidélité : **F** = fidèle (même fonction, même parcours) · **A** = adaptée/améliorée · **N** = nouvelle (demandée par le cahier des charges, absente ou non vérifiée chez la référence).
Priorité : **P0** socle (livré dans ce dépôt) · **P1** lot suivant · **P2** évolution.

| # | Fonctionnalité observée | Comportement de référence | Fidélité | Adaptation ECOM MARKET | Priorité | Non vérifiable → hypothèse |
|---|---|---|---|---|---|---|
| 1 | Marketplace centrale multi-boutiques | Page unique client-side agrégeant toutes les boutiques | A | Pages Next.js rendues côté serveur (SEO, rapidité sur Android d'entrée de gamme), sections commerciales | P0 | — |
| 2 | Filtre pays / ville « Livraison depuis » | Sélecteurs pays → villes chargées dynamiquement | F | Pays/villes en base, activables par l'admin ; mémorisés en cookie ; + quartier | P0 | — |
| 3 | Validation téléphone par pays | Indicatif + longueur + préfixes autorisés par pays | F | `libphonenumber-js` + indicatif stocké par pays, affichage E.164 international | P0 | Règles exactes de préfixes BF (`debut: null`) |
| 4 | Liste fermée de villes + « autre » | `autre: true` | F | Villes en base + saisie libre « Autre ville » côté acheteur | P0 | — |
| 5 | Onglets Tous / Premium / Promos / Nouveautés / Près de moi / Ventes flash | Filtres rapides au-dessus de la grille | F | Onglets identiques (Premium → « Boutiques vérifiées / Pro »), « Près de moi » = même ville puis même pays | P0 | Algorithme exact de classement « Premium » |
| 6 | Ventes flash avec compte à rebours | `promoFin`, `flashReste` | F | Promotion planifiée (`promoStartsAt/promoEndsAt`), prix barré uniquement si promo réelle active | P0 | Règles d'éligibilité aux ventes flash |
| 7 | Recherche produits (≥ 2 caractères) | `/api/marketplace-produits?q=` | A | Recherche PostgreSQL (ILIKE + index trigram prévu) filtrable par pays/ville/catégorie/prix ; abstraction `SearchService` pour Meilisearch/OpenSearch plus tard | P0 | Pertinence / tri de la référence |
| 8 | Catégories | Libellés « Mode & Vêtements », « Beauté & Cosmétique »… | A | 22 catégories + sous-catégories dynamiques, attributs/filtres par catégorie (JSON schema) | P0 | Arborescence complète de la référence |
| 9 | Vu récemment / Coups de cœur | Stockage local navigateur | A | « Vu récemment » local (localStorage) + favoris persistés en base pour les comptes | P0 (vu récemment), P1 (favoris serveur) | Mode de calcul des « Coups de cœur » |
| 10 | Chargement infini | « Chargement de plus de produits… » | A | Pagination serveur par curseur + bouton « Voir plus » (meilleur sur réseau limité) | P0 | — |
| 11 | Boutique sur sous-domaine | `<slug>.mfbservices97.online` | A | URL `/boutique/<slug>` au lancement ; middleware prêt pour `<slug>.ecommarket.africa` (variable `SHOP_SUBDOMAINS_ENABLED`) | P0 / P2 | — |
| 12 | Traçage `mfb_ref=marketplace` | Paramètre sur liens sortants | A | Attribution `ref` (marketplace, agence, partage) enregistrée sur la visite et la commande | P1 | — |
| 13 | Fiche produit | `/produit?p=<id>` sur la boutique | A | `/produit/<slug>` : galerie, variantes, ville/pays, vendeur, badge vérifié, OG tags, produits similaires | P0 | Contenu complet de la fiche référence |
| 14 | Description HTML riche | `desc` en HTML avec emojis | A | Texte enrichi assaini (pas de HTML brut stocké → protection XSS), rendu Markdown léger | P0 | — |
| 15 | Panier marketplace | `/api/panier`, total en FCFA | A | Panier multi-vendeurs → **sous-commandes par boutique** (frais, statut, responsabilité séparés) | P0 | Gestion multi-vendeurs de la référence |
| 16 | Commande → vendeur reçoit nom/numéro/adresse | Livraison organisée par le vendeur | F | Checkout invité ou connecté : téléphone, ville, quartier, point de repère, mode de livraison, mode de règlement ; suivi par référence | P0 | — |
| 17 | Commande via WhatsApp | « Commandez sur WhatsApp » dans les fiches | F | Bouton WhatsApp prérempli (produit, variante, prix, référence) ; commande enregistrée « WhatsApp – non payée » | P0 | — |
| 18 | Produits numériques payés en mobile money | Partenaire agréé, livraison auto | A | `PaymentProviderInterface` (CinetPay, PayDunya en squelette documenté) ; livraison numérique après confirmation **serveur** du paiement | P1 | Prestataire réel utilisé par la référence |
| 19 | Physiques réglés hors plateforme | Arrangement vendeur-client | F | Modes « Paiement direct au vendeur », « Paiement à la livraison », « Paiement manuel avec validation » ; **jamais marqué payé automatiquement** | P0 | — |
| 20 | Retraits vérifiés | Contrôle avant versement, plafond = solde gagné | A | Non activé au lancement (pas de détention de fonds de tiers) ; modèle de données `Payout` prévu, à activer avec montage réglementaire | P2 | Mécanique exacte des retraits |
| 21 | Abonnement mensuel fixe, 0 % commission | Prix montré dans l'espace vendeur | A | Offres GRATUIT / PRO / BUSINESS configurables par pays et devise, mensuel/annuel, essai, coupons, rappels, rétrogradation progressive | P0 | Montants réels de la référence (non publics) |
| 22 | Boutiques « Premium » mises en avant | Flag `premium` | F | Mise en avant liée au plan + emplacements sponsorisés gérés par l'admin | P0 (plan) / P1 (sponsorisé) | — |
| 23 | Programme agences & développeurs | Inscription `profil=agence`, commission sur abonnements | A | Rôle `AGENT` : crée/accompagne des boutiques, rattachement `agentId`, commission configurable par contrat | P1 | Taux de commission |
| 24 | Inscription vendeur en ~2–5 min | Nom boutique, pays, ville, WhatsApp | F | Assistant 6 étapes (compte → vérification → infos → visuels → 1er produit → ouverture) | P0 | Vérification OTP réelle → code affiché en dev, SMS via fournisseur à brancher |
| 25 | Assistant de rédaction | « une aide à la rédaction est disponible » | A | `AiAssistant` : appel API LLM si clé configurée, sinon amélioration par gabarits locaux | P1 (fallback P0) | Fournisseur IA utilisé |
| 26 | Vendeurs identifiés | Numéro + boutique confirmés avant mise en avant | F | Statut de vérification de boutique, badge attribué par l'admin, journalisé | P0 | Pièces demandées |
| 27 | PWA installable | `manifest.json`, bannière d'installation | F | Manifest + icônes originales, pages légères ; service worker hors-ligne | P0 (manifest) / P1 (SW) | — |
| 28 | Mode sombre, FR/EN | Bascule dans l'en-tête | F | Thème clair/sombre persistant, i18n FR/EN extensible | P0 | — |
| 29 | Pixels publicitaires / CAPI | `/api/public?r=pixels`, `marketplace-capi` | A | Hors socle ; à ajouter avec consentement cookies | P2 | — |
| 30 | Page « Vendre en ligne » orientée douleur | « c'est combien ? », compte à rebours | A | Page `/vendre` originale : bénéfices, étapes, offres ; **pas de faux compte à rebours ni fausse urgence** | P0 | — |
| 31 | Compteurs « boutiques / pays / catégories » | Valeurs « — » en HTML (chargées en JS) | A | Compteurs calculés réellement depuis la base | P0 | — |
| 32 | Contact WhatsApp de la plateforme | « Par WhatsApp depuis n'importe quelle page » | F | Bouton flottant WhatsApp (support plateforme ou vendeur selon la page) | P0 | — |
| 33 | Tutoriels vidéo | Chaîne YouTube | A | Centre d'aide `/aide` + emplacement vidéos | P1 | — |
| 34 | Formations / import Chine | Pages annexes | — | Hors périmètre (pas demandé) | — | — |
| 35 | Avis clients | Non observé dans les données publiques | N | Avis uniquement liés à une commande livrée (vérifiés) ; aucune donnée fictive présentée comme réelle | P0 (modèle + affichage) | Existence d'avis chez la référence |
| 36 | Back-office admin | Non public | N | Admin complet multi-pays, rôles, journal d'audit | P0 | Totalité |
| 37 | Tableau de bord vendeur | Non public (`/vendeurs1/dashboard`) | N | 12 menus, distinction **commandes / encaissé / déclaré** | P0 | Totalité |
| 38 | Import CSV/Excel | Non observé | N | Import/export CSV + XLSX avec rapport d'erreurs ligne par ligne | P0 | — |
| 39 | QR code boutique | Non observé (« imprimer sur une carte ») | N | QR code SVG généré pour boutique et produit | P0 | — |
| 40 | Multi-devises | XOF, XAF, USD observés ; aucune conversion visible | F | Prix toujours affichés dans la devise saisie par le vendeur ; **aucune conversion à taux inventé** | P0 | — |

## Éléments non vérifiables (hypothèses retenues)

- **Contenu de la vidéo Facebook** : seule la description est lisible sans compte. Elle confirme le positionnement (« zéro commission », « tout se vend », visibilité ville/pays/Afrique). Aucun détail d'écran n'est supposé observé.
- **Espace vendeur et administration** : non accessibles. Conçus à partir du cahier des charges ECOM MARKET.
- **Tarifs des abonnements** : non publics. ECOM MARKET ne fige aucun tarif : les montants sont saisis par l'admin (valeurs de démonstration dans le seed, clairement marquées).
- **Prestataire de paiement de la référence** : non nommé (« partenaire agréé »). ECOM MARKET prévoit CinetPay et PayDunya, désactivés tant que les contrats et clés ne sont pas fournis.
- **Rendu mobile exact** : non capturé. La conception ECOM MARKET est mobile-first indépendamment.
