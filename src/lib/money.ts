// Formatage des prix. Les montants sont stockés en unités entières dans la devise saisie
// par le vendeur. AUCUNE conversion entre devises n'est effectuée : pas de taux inventé.

const CURRENCY_LABEL: Record<string, string> = {
  XOF: "FCFA",
  XAF: "FCFA",
  GHS: "GH₵",
  NGN: "₦",
  GNF: "GNF",
  CVE: "CVE",
  SLE: "Le",
  LRD: "L$",
  GMD: "D",
  USD: "$",
  EUR: "€",
};

export function formatPrice(amount: number, currency: string, locale = "fr"): string {
  const n = new Intl.NumberFormat(locale === "en" ? "en-US" : "fr-FR", { maximumFractionDigits: 0 })
    .format(amount)
    .replace(/ | /g, " ");
  const label = CURRENCY_LABEL[currency] ?? currency;
  return ["$", "€", "₦", "GH₵", "L$"].includes(label) && locale === "en" ? `${label}${n}` : `${n} ${label}`;
}

export interface PriceInput {
  price: number;
  promoPrice: number | null;
  promoStartsAt: Date | null;
  promoEndsAt: Date | null;
}

/** Une promotion n'est affichée (prix barré) que si elle est réelle et active maintenant. */
export function isPromoActive(p: PriceInput, now = new Date()): boolean {
  if (p.promoPrice == null || p.promoPrice <= 0 || p.promoPrice >= p.price) return false;
  if (p.promoStartsAt && p.promoStartsAt > now) return false;
  if (p.promoEndsAt && p.promoEndsAt < now) return false;
  return true;
}

export function effectivePrice(p: PriceInput, now = new Date()): number {
  return isPromoActive(p, now) ? (p.promoPrice as number) : p.price;
}

export function discountPercent(p: PriceInput, now = new Date()): number {
  if (!isPromoActive(p, now)) return 0;
  return Math.round(((p.price - (p.promoPrice as number)) / p.price) * 100);
}
