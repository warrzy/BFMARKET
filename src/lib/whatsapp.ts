import { waDigits } from "./phone";
import { formatPrice } from "./money";

export function waLink(phoneE164: string, message?: string): string {
  const base = `https://wa.me/${waDigits(phoneE164)}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function waShareLink(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export interface WaOrderMessage {
  shopName: string;
  productTitle: string;
  variant?: string | null;
  quantity?: number;
  unitPrice: number;
  currency: string;
  productUrl: string;
  reference?: string;
  locale?: string;
}

/** Message de commande prérempli : produit, variante, prix, référence. */
export function buildWhatsAppOrderMessage(m: WaOrderMessage): string {
  const en = m.locale === "en";
  const qty = m.quantity ?? 1;
  const lines = [
    en ? `Hello ${m.shopName}, I would like to order:` : `Bonjour ${m.shopName}, je souhaite commander :`,
    `• ${m.productTitle}${m.variant ? ` (${m.variant})` : ""}`,
    `• ${en ? "Quantity" : "Quantité"} : ${qty}`,
    `• ${en ? "Price" : "Prix"} : ${formatPrice(m.unitPrice * qty, m.currency, m.locale)}`,
  ];
  if (m.reference) lines.push(`• ${en ? "Reference" : "Référence"} : ${m.reference}`);
  lines.push(m.productUrl);
  lines.push(en ? "(Sent from ECOM MARKET)" : "(Envoyé depuis ECOM MARKET)");
  return lines.join("\n");
}
