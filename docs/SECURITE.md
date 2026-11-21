# Sécurité et données personnelles

| Exigence | Mise en œuvre |
|---|---|
| Validation des entrées | Zod sur toutes les Server Actions et routes API |
| Injection SQL | Prisma (requêtes paramétrées) ; les quelques requêtes brutes utilisent les gabarits paramétrés `$queryRaw` |
| XSS | Rendu React échappé ; descriptions vendeurs stockées en texte et rendues par `richText()` (échappement + gras uniquement) ; JSON-LD échappé |
| CSRF | Server Actions Next.js (contrôle d'origine intégré), cookies `SameSite=Lax`, `HttpOnly`, `Secure` en production |
| Permissions serveur | `requireUser / requireShop / requireAdmin` sur chaque action ; périmètre pays pour les admins locaux |
| Isolation vendeurs | Filtre `shopId` systématique, test E2E dédié |
| Mots de passe | bcrypt (coût 12), comparaison factice pour les comptes inexistants (anti-énumération) |
| Sessions | Jeton aléatoire 256 bits, seul son SHA-256 est stocké, révocation à la suspension |
| Limitation de débit | Persistée en base : connexion (IP + identifiant), inscription, OTP, commandes, webhooks, signalements, IA |
| OTP | 6 chiffres hachés, 10 min, 5 essais ; affichage à l'écran **interdit en production** (seulement dev / préprod explicite) |
| Uploads | Taille limitée, image décodée et réencodée en WebP (supprime EXIF/GPS et contenu actif), vidéos MP4/WebM avec contrôle de signature |
| Exports tableur | Neutralisation des formules (`=`, `+`, `-`, `@`) |
| Secrets | Variables d'environnement uniquement ; clés de paiement jamais en base ; `.env` ignoré par git |
| Journal d'audit | `AuditLog` : vérifications, modération, rôles, validations de paiement, changements de prestataires, paramètres, connexions admin — sans données sensibles |
| En-têtes | HSTS, nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy |
| Sauvegardes | `pg_dump` quotidien (rotation 14 j) + `deploy/restore.sh` ; tests de restauration à planifier |

## Données personnelles

- Export JSON depuis « Mon compte » (`/api/compte/export`).
- Suppression : anonymisation du compte et des commandes, fermeture des boutiques possédées.
- Coordonnées de commande transmises uniquement au vendeur concerné.
- Politique de confidentialité, CGU et mentions légales fournies comme **modèles à faire valider juridiquement** (au Burkina Faso : loi n°001-2021/AN, autorité : CIL ; équivalents dans chaque pays activé).

## Avant la mise en production

1. Définir un canal OTP réel (`OTP_DELIVERY=webhook` vers une passerelle SMS) — sans lui l'inscription échoue volontairement en production.
2. Générer `SESSION_SECRET` et `CRON_SECRET` forts.
3. Tester CinetPay / PayDunya en sandbox avant d'activer le mode `live`.
4. Faire réaliser un audit de sécurité externe et un test de restauration.
