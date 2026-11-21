# État d'avancement

## Livré dans ce dépôt (socle fonctionnel)

- Marketplace : accueil avec les 15 sections demandées, catalogue filtrable (pays, ville, catégorie, type, prix, onglets Vérifiées / Promos / Nouveautés / Près de moi / Ventes flash), 22 catégories + sous-catégories à attributs, fiches produit (galerie, vidéo, variantes, stock, livraison, vendeur vérifié, avis vérifiés, similaires, Open Graph + JSON-LD, partage WhatsApp / Facebook / TikTok), boutiques mini-sites (thèmes, rayons, recherche interne, horaires, politiques, QR code), favoris, « vu récemment », signalements.
- Achat : panier multi-vendeurs → sous-commandes par boutique, commande invitée ou connectée (téléphone, ville, quartier, repère), choix livraison/paiement/coupon par boutique, suivi par lien sécurisé, déclaration de paiement, paiement en ligne (si activé), avis après livraison, commande directe WhatsApp préremplie.
- Vendeur : création de boutique en 6 étapes, tableau de bord (commandes / encaissé vérifié / déclaré distingués), produits (CRUD, duplication, variantes, promotions planifiées, vidéo, SEO, assistant IA), commandes (statuts, encaissement tracé), clients, stocks, promotions et coupons, statistiques, paiements, abonnement, import/export CSV/Excel, collaborateurs, assistance.
- Admin : tableau de bord global et par pays, vendeurs/boutiques (vérification, suspension), modération produits, commandes, utilisateurs et rôles (dont admins locaux par pays), catégories, pays et villes, abonnements (offres, tarifs par pays, validation des paiements, coupons), prestataires de paiement par pays, transactions et webhooks, bannières, signalements et litiges, support, journal d'audit, paramètres globaux.
- Transverse : FR/EN, mode sombre, mobile first, PWA (manifest), sitemap/robots, export/suppression des données, Docker/Caddy, sauvegardes, CI.

## Non vérifié ou à compléter (hypothèses explicites)

| Sujet | État |
|---|---|
| CinetPay / PayDunya | Implémentés d'après les API publiques, **non testés en sandbox** (pas de clés). Désactivés par défaut. |
| Orange Money / Moov / Wave / MTN en direct | Passent par les agrégateurs ci-dessus ; intégration directe non réalisée (contrats opérateurs requis). |
| Envoi des OTP | Canal webhook générique ; passerelle SMS à choisir. |
| Image Docker | Dockerfile écrit ; build exécuté par la CI (pas de démon Docker dans l'environnement de développement utilisé). |
| Charge | Aucun test de charge : la capacité « dizaines de milliers de vendeurs / millions de produits » reste à démontrer (k6, index trigram `pg_trgm`, moteur de recherche dédié). |
| Textes légaux | Modèles à valider juridiquement. |
| Cahier des charges | Le prompt reçu s'interrompt au § 20 (« Respect des réglementations applicables selon les pays cibl… ») ; les sections suivantes éventuelles n'ont pas été prises en compte. |

## Prochaines étapes suggérées

1. Activer CinetPay en sandbox au Burkina Faso, tester bout en bout, puis passer en `live`.
2. Brancher une passerelle SMS pour les OTP.
3. Index `pg_trgm` pour la recherche + tests de charge.
4. Service worker hors ligne, notifications push.
5. Programme agences (commissions sur abonnements), livreurs partenaires et suivi de livraison, générateur de visuels promotionnels, favoris synchronisés invités.
6. WhatsApp Business API officielle (modèles de messages, consentement).
