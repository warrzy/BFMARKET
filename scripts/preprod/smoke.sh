#!/usr/bin/env bash
# ECOM MARKET — contrôles HTTP post-déploiement (lecture seule).
# Usage : bash smoke.sh http://127.0.0.1:3100            (sur le VPS, derrière Nginx)
#         BASIC_AUTH=recette:motdepasse bash smoke.sh https://preprod.ecommarket.africa
set -uo pipefail
BASE="${1:?URL de base requise}"
AUTH=(); [ -n "${BASIC_AUTH:-}" ] && AUTH=(-u "$BASIC_AUTH")
PASS=0; FAIL=0
ok()  { printf '  \033[32m✓\033[0m %s\n' "$1"; PASS=$((PASS+1)); }
ko()  { printf '  \033[31m✗\033[0m %s\n' "$1"; FAIL=$((FAIL+1)); }
get() { curl -sS -m 20 "${AUTH[@]}" "$@"; }
code(){ curl -sS -o /dev/null -m 20 -w '%{http_code}' "${AUTH[@]}" "$@"; }

echo "Contrôles sur $BASE"
[ "$(code "$BASE/api/health")" = 200 ] && get "$BASE/api/health" | grep -q '"ok"' && ok "santé + base de données" || ko "santé /api/health"

HOME_HTML=$(get "$BASE/")
echo "$HOME_HTML" | grep -q "un seul marché" && ok "accueil de la marketplace" || ko "accueil"
echo "$HOME_HTML" | grep -q 'href="/produit/' && ok "produits affichés sur l'accueil" || ko "aucun produit sur l'accueil (seed ?)"

[ "$(code "$BASE/produits?tab=promo&sort=price_asc")" = 200 ] && ok "catalogue + filtres" || ko "catalogue"
get "$BASE/produits?q=karit" | grep -q 'href="/produit/' && ok "recherche" || ko "recherche"
[ "$(code "$BASE/categorie/mode-vetements")" = 200 ] && ok "page catégorie" || ko "page catégorie"
[ "$(code "$BASE/boutiques")" = 200 ] && ok "liste des boutiques" || ko "liste des boutiques"

PRODUCT=$(echo "$HOME_HTML" | grep -oE 'href="/produit/[a-z0-9-]+"' | head -1 | cut -d'"' -f2)
if [ -n "$PRODUCT" ]; then
  P_HTML=$(get "$BASE$PRODUCT")
  echo "$P_HTML" | grep -q 'og:title' && ok "fiche produit + Open Graph" || ko "fiche produit"
  echo "$P_HTML" | grep -qE 'wa\.me/[0-9]+\?text=' && ok "commande WhatsApp préremplie" || ko "lien WhatsApp"
fi
SHOP=$(get "$BASE/boutiques" | grep -oE 'href="/boutique/[a-z0-9-]+"' | head -1 | cut -d'"' -f2)
[ -n "$SHOP" ] && [ "$(code "$BASE$SHOP")" = 200 ] && ok "boutique publique" || ko "boutique publique"
[ -n "$SHOP" ] && [ "$(code "$BASE/api/qr?path=$SHOP")" = 200 ] && ok "QR code boutique" || ko "QR code"

[ "$(code "$BASE/panier")" = 200 ] && ok "panier" || ko "panier"
[ "$(code "$BASE/inscription")" = 200 ] && [ "$(code "$BASE/connexion")" = 200 ] && ok "pages inscription/connexion" || ko "auth"
loc=$(curl -sS -o /dev/null -m 20 -w '%{redirect_url}' "${AUTH[@]}" "$BASE/vendeur"); [[ "$loc" == *"/connexion"* ]] && ok "espace vendeur protégé" || ko "espace vendeur non protégé ($loc)"
loc=$(curl -sS -o /dev/null -m 20 -w '%{redirect_url}' "${AUTH[@]}" "$BASE/admin"); [[ "$loc" == *"/connexion"* ]] && ok "administration protégée" || ko "administration non protégée ($loc)"
[ "$(code -X POST "$BASE/api/cron/subscriptions")" = 401 ] && ok "tâche planifiée protégée par secret" || ko "cron non protégé"

# Anti-indexation : vérifiée via l'URL publique (Nginx l'impose même si l'application ne le fait pas)
if [ -z "${SMOKE_LOCAL:-}" ]; then
  get "$BASE/robots.txt" | grep -qE '^Disallow: /$' && ok "robots.txt : indexation interdite" || ko "robots.txt autorise l'indexation"
  curl -sSI -m 20 "${AUTH[@]}" "$BASE/" | grep -qi '^x-robots-tag: .*noindex' && ok "en-tête X-Robots-Tag noindex" || ko "X-Robots-Tag absent"
fi
curl -sSI -m 20 "${AUTH[@]}" "$BASE/" | grep -qi '^x-content-type-options: nosniff' && ok "en-têtes de sécurité" || ko "en-têtes de sécurité"
if [[ "$BASE" == https://* ]]; then
  curl -sS -o /dev/null -m 20 "$BASE/" && ok "certificat TLS valide" || ko "certificat TLS"
  [ -n "${BASIC_AUTH:-}" ] && { [ "$(curl -sS -o /dev/null -m 20 -w '%{http_code}' "$BASE/")" = 401 ] && ok "accès recette protégé (401 sans identifiants)" || ko "préprod accessible sans identifiants"; }
fi

echo "Résultat : $PASS réussis, $FAIL échoués"
[ "$FAIL" -eq 0 ]
