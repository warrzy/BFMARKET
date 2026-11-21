import { discountPercent, effectivePrice, formatPrice, isPromoActive, type PriceInput } from "@/lib/money";

export function Price({ p, currency, locale = "fr", size = "md" }: { p: PriceInput; currency: string; locale?: string; size?: "sm" | "md" | "lg" }) {
  const promo = isPromoActive(p);
  const cls = size === "lg" ? "text-3xl" : size === "sm" ? "text-[15px]" : "text-lg";
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <span className={`${cls} font-extrabold tracking-tight ${promo ? "text-brand-600 dark:text-brand-400" : ""}`}>
        {formatPrice(effectivePrice(p), currency, locale)}
      </span>
      {promo && (
        <>
          <span className="text-sm muted line-through">{formatPrice(p.price, currency, locale)}</span>
          {size !== "sm" && <span className="badge bg-brand-500 text-white">-{discountPercent(p)}%</span>}
        </>
      )}
    </div>
  );
}
