# Préproduction ECOM MARKET sur le VPS Hostinger

Kit : `scripts/preprod/` — `audit.sh` (lecture seule), `deploy.sh`, `smoke.sh`, `rollback.sh`.

## Ce que le déploiement modifie (et rien d'autre)

| Élément | Emplacement |
|---|---|
| Code, releases, Node.js local | `/var/www/ecom-market-preprod/{releases,current,runtime}` |
| Secrets (600/640) | `/var/www/ecom-market-preprod/shared/.env`, `shared/credentials.txt` |
| Médias, logs, sauvegardes | `/var/www/ecom-market-preprod/shared/{uploads,logs,backups}` |
| Utilisateur système | `ecommarket-preprod` (sans shell) |
| Base | rôle + base `ecom_preprod` dans le PostgreSQL existant, **ou** projet Docker Compose isolé `ecom-market-preprod-db` (port lié à 127.0.0.1) |
| Services | `ecom-market-preprod.service`, timers `-cron` (horaire) et `-backup` (quotidien) |
| Nginx | **un nouveau fichier** `sites-available/ecom-market-preprod` + lien ; `nginx -t` puis `reload` |
| Accès recette | `/etc/nginx/ecom-market-preprod.htpasswd` (authentification HTTP) |
| Logrotate | `/etc/logrotate.d/ecom-market-preprod` |

Jamais : `docker system prune`, suppression de conteneurs/volumes tiers, `systemctl restart nginx`, modification de `nginx.conf`, d'un autre site, d'un Node global ou de `pg_hba.conf`.

## Étapes

```bash
# 1. Sur le VPS : récupérer le kit (dépôt public) ou le copier par scp
git clone --branch claude/sharp-clarke-pp53h8 https://github.com/warrzy/bfmarket.git /tmp/ecom-kit
```

```bash
# 2. Audit (aucune modification) — à relire avant de continuer
sudo bash /tmp/ecom-kit/scripts/preprod/audit.sh preprod.ecommarket.africa | tee /tmp/ecom-audit.txt
```

DNS : créer chez le registrar un enregistrement **A** `preprod.ecommarket.africa → <IP du VPS>` (l'audit affiche l'IP et indique si le domaine pointe déjà vers le VPS).

```bash
# 3. Déploiement (HTTPS demandé automatiquement seulement si le DNS pointe vers le VPS)
sudo DOMAIN=preprod.ecommarket.africa LE_EMAIL=vous@exemple.com bash /tmp/ecom-kit/scripts/preprod/deploy.sh
```

Dépôt privé : `REPO_URL=https://<jeton-lecture>@github.com/warrzy/bfmarket.git`, ou bien depuis votre poste `git archive --format=tar.gz -o ecom.tar.gz <commit>`, `scp`, puis `SOURCE_TARBALL=/chemin/ecom.tar.gz COMMIT=<commit>`.

Commit déployé : par défaut le dernier commit de la branche ; `COMMIT=c79aa2b` pour le commit initial (la non-indexation est alors assurée par Nginx : mot de passe, `robots.txt`, `X-Robots-Tag`).

## Contrôles

```bash
sudo cat /var/www/ecom-market-preprod/shared/credentials.txt       # identifiants recette/admin/démo
BASIC_AUTH='recette:<mot de passe>' bash scripts/preprod/smoke.sh https://preprod.ecommarket.africa
```

Parcours complets (inscription, boutique, commande, vendeur, admin) depuis un poste avec Node :

```bash
E2E_BASE_URL=https://preprod.ecommarket.africa E2E_HTTP_USER=recette E2E_HTTP_PASSWORD='…' \
SEED_ADMIN_EMAIL=admin@preprod.ecommarket.local SEED_ADMIN_PASSWORD='…' SEED_DEMO_PASSWORD='…' \
npx playwright test
```

## Exploitation

```bash
sudo systemctl status ecom-market-preprod
sudo systemctl restart ecom-market-preprod
sudo tail -f /var/www/ecom-market-preprod/shared/logs/app.log /var/www/ecom-market-preprod/shared/logs/app-error.log
sudo journalctl -u ecom-market-preprod -n 100
ls /var/www/ecom-market-preprod/shared/logs/deploy-*.log           # journaux de déploiement
systemctl list-timers 'ecom-market-preprod*'
```

## Rollback

- Automatique : si `/api/health` ou `smoke.sh` échoue, `deploy.sh` revient à la release précédente (premier déploiement : service arrêté, site Nginx retiré si sa configuration est invalide).
- Manuel : `sudo bash scripts/preprod/rollback.sh` (release précédente) ou `rollback.sh <commit>`.
- Base : sauvegarde automatique avant chaque migration (`shared/backups/pre-deploy-*.dump`) ; restauration avec `sudo RESTORE_DB=<fichier> bash rollback.sh` (l'état courant est sauvegardé d'abord).
- Retrait complet de la préprod (à exécuter seulement sur décision) : arrêter/désactiver les 3 unités, supprimer les fichiers d'unités, le site Nginx et son lien (`nginx -t && systemctl reload nginx`), puis `/var/www/ecom-market-preprod`, la base `ecom_preprod` et l'utilisateur.

## Paiements

CinetPay et PayDunya restent désactivés : clés vides dans `shared/.env` et prestataires `enabled=false` en base. Seuls « paiement direct », « à la livraison » et « validation manuelle » sont actifs.
