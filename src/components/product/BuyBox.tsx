"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { WhatsAppIcon } from "@/components/layout/WhatsAppFab";
import { formatPrice } from "@/lib/money";
import { buildWhatsAppOrderMessage, waLink } from "@/lib/whatsapp";

interface Props {
  product: { id: string; slug: string; title: string; currency: string; unitPrice: number; stock: number | null; image?: string | null; ref: string; url: string; available: boolean };
  variants: { id: string; name: string; price: number | null; stock: number | null }[];
  shop: { id: string; name: string; whatsapp?: string | null };
  labels: { addToCart: string; order: string; orderWhatsApp: string; variant: string; quantity: string; outOfStock: string; added: string; chooseVariant: string };
  locale: string;
}

export function BuyBox({ product, variants, shop, labels, locale }: Props) {
  const { add } = useCart();
  const router = useRouter();
  const [variantId, setVariantId] = useState<string>(variants.length === 1 ? variants[0].id : "");
  const [qty, setQty] = useState(1);
  const [flash, setFlash] = useState("");
  const variant = variants.find((v) => v.id === variantId);
  const unit = variant?.price ?? product.unitPrice;
  const stock = variant ? variant.stock ?? product.stock : product.stock;
  const out = !product.available || stock === 0;
  const needVariant = variants.length > 0 && !variant;

  const waHref = useMemo(() => shop.whatsapp ? waLink(shop.whatsapp, buildWhatsAppOrderMessage({
    shopName: shop.name, productTitle: product.title, variant: variant?.name, quantity: qty, unitPrice: unit,
    currency: product.currency, productUrl: product.url, reference: product.ref, locale,
  })) : null, [shop, product, variant, qty, unit, locale]);

  const addLine = () => {
    if (needVariant) { setFlash(labels.chooseVariant); return false; }
    add({ productId: product.id, variantId: variant?.id ?? null, quantity: qty, title: product.title, variantName: variant?.name, unitPrice: unit,
      currency: product.currency, image: product.image, slug: product.slug, shopId: shop.id, shopName: shop.name });
    setFlash(labels.added);
    return true;
  };

  return (
    <div className="space-y-4">
      {variants.length > 0 && (
        <div>
          <p className="label">{labels.variant}</p>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button key={v.id} type="button" onClick={() => { setVariantId(v.id); setFlash(""); }} disabled={v.stock === 0}
                className={`chip ${variantId === v.id ? "chip-active" : ""} disabled:line-through disabled:opacity-40`}>
                {v.name}{v.price != null && v.price !== product.unitPrice ? ` · ${formatPrice(v.price, product.currency, locale)}` : ""}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-center gap-3">
        <span className="label mb-0">{labels.quantity}</span>
        <div className="flex items-center rounded-xl border border-[rgb(var(--border))]">
          <button type="button" className="p-2.5" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="-"><Minus className="h-4 w-4" /></button>
          <span className="w-10 text-center font-semibold tabular-nums">{qty}</span>
          <button type="button" className="p-2.5" onClick={() => setQty((q) => Math.min(stock ?? 999, q + 1))} aria-label="+"><Plus className="h-4 w-4" /></button>
        </div>
        {variant && <span className="text-lg font-bold">{formatPrice(unit * qty, product.currency, locale)}</span>}
      </div>
      {out ? (
        <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-300">{labels.outOfStock}</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" className="btn-primary py-3.5 text-base" onClick={() => addLine() && router.push("/panier")}>{labels.order}</button>
          <button type="button" className="btn-ghost py-3.5 text-base" onClick={addLine}><ShoppingBag className="h-5 w-5" />{labels.addToCart}</button>
        </div>
      )}
      {waHref && (
        <a href={needVariant ? undefined : waHref} onClick={(e) => { if (needVariant) { e.preventDefault(); setFlash(labels.chooseVariant); } }}
          target="_blank" rel="noopener noreferrer" className="btn-wa w-full py-3.5 text-base">
          <WhatsAppIcon className="h-5 w-5" />{labels.orderWhatsApp}
        </a>
      )}
      {flash && <p role="status" className="text-center text-sm font-medium text-brand-600 dark:text-brand-400">{flash}</p>}
    </div>
  );
}
