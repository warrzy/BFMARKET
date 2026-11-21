import { effectivePrice, type PriceInput } from "@/lib/money";

export interface CartLineInput {
  productId: string;
  variantId?: string | null;
  quantity: number;
}

export interface PricedProduct extends PriceInput {
  id: string;
  shopId: string;
  title: string;
  currency: string;
  stock: number | null;
  status: string;
  variants: { id: string; name: string; price: number | null; stock: number | null }[];
}

export interface PricedLine {
  productId: string;
  variantId: string | null;
  variantName: string | null;
  title: string;
  unitPrice: number;
  quantity: number;
  total: number;
  shopId: string;
  currency: string;
}

export class CartError extends Error {}

/** Prix calculés côté serveur uniquement (le client n'envoie que des identifiants et quantités). */
export function priceLines(lines: CartLineInput[], products: Map<string, PricedProduct>, now = new Date()): PricedLine[] {
  return lines.map((l) => {
    const p = products.get(l.productId);
    if (!p || p.status !== "ACTIVE") throw new CartError("Un produit du panier n'est plus disponible.");
    const qty = Math.floor(l.quantity);
    if (!Number.isFinite(qty) || qty < 1 || qty > 999) throw new CartError("Quantité invalide.");
    let unit = effectivePrice(p, now);
    let variantName: string | null = null;
    let stock = p.stock;
    if (l.variantId) {
      const v = p.variants.find((x) => x.id === l.variantId);
      if (!v) throw new CartError(`Variante introuvable pour « ${p.title} ».`);
      variantName = v.name;
      if (v.price != null) unit = v.price;
      if (v.stock != null) stock = v.stock;
    } else if (p.variants.length > 0) {
      throw new CartError(`Choisissez une variante pour « ${p.title} ».`);
    }
    if (stock != null && stock < qty) throw new CartError(`Stock insuffisant pour « ${p.title} ».`);
    return {
      productId: p.id, variantId: l.variantId ?? null, variantName, title: p.title,
      unitPrice: unit, quantity: qty, total: unit * qty, shopId: p.shopId, currency: p.currency,
    };
  });
}

export function groupByShop(lines: PricedLine[]): Map<string, PricedLine[]> {
  const m = new Map<string, PricedLine[]>();
  for (const l of lines) m.set(l.shopId, [...(m.get(l.shopId) ?? []), l]);
  return m;
}

export interface CouponLike {
  percentOff: number | null;
  amountOff: number | null;
  currency: string | null;
}

export function couponDiscount(c: CouponLike, subtotal: number, currency: string): number {
  if (c.percentOff) return Math.min(subtotal, Math.round((subtotal * Math.min(c.percentOff, 100)) / 100));
  if (c.amountOff && (!c.currency || c.currency === currency)) return Math.min(subtotal, c.amountOff);
  return 0;
}
