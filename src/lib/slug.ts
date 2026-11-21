export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " et ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export function randomCode(length = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export const RESERVED_SHOP_SLUGS = new Set([
  "admin", "api", "vendeur", "boutique", "boutiques", "produit", "produits", "panier", "commande",
  "connexion", "inscription", "aide", "vendre", "www", "app", "static", "ecom", "ecommarket", "support",
]);
