import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, MapPin, Zap } from "lucide-react";
import type { ProductCardData } from "@/server/modules/catalog/queries";
import { Price } from "@/components/ui/Price";
import { Countdown } from "@/components/ui/Countdown";
import { discountPercent, isPromoActive } from "@/lib/money";

export function ProductCard({ p, locale = "fr", priority = false }: { p: ProductCardData; locale?: string; priority?: boolean }) {
  const img = p.images[0]?.url;
  const promo = isPromoActive(p);
  const flash = promo && p.promoEndsAt;
  const out = p.stock === 0;
  return (
    <Link
      href={`/produit/${p.slug}`}
      className="group card flex snap-start flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-lift"
    >
      <div className="relative aspect-square overflow-hidden bg-[rgb(var(--surface-2))]">
        {img ? (
          <Image src={img} alt={p.images[0]?.alt ?? p.title} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 240px"
            className="object-cover transition duration-500 group-hover:scale-105" priority={priority} />
        ) : (
          <div className="grid h-full place-items-center text-xs muted">Photo à venir</div>
        )}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {promo && <span className="badge bg-brand-500 text-white shadow">-{discountPercent(p)}%</span>}
          {p.type === "DIGITAL" && <span className="badge bg-night-900/80 text-white">{locale === "en" ? "Digital" : "Numérique"}</span>}
          {p.type === "SERVICE" && <span className="badge bg-night-900/80 text-white">Service</span>}
        </div>
        {flash && (
          <div className="absolute inset-x-2 bottom-2 flex items-center justify-between rounded-lg bg-night-950/85 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur">
            <span className="inline-flex items-center gap-1 text-gold-400"><Zap className="h-3 w-3 fill-current" />Flash</span>
            <Countdown to={p.promoEndsAt!} compact />
          </div>
        )}
        {out && <div className="absolute inset-0 grid place-items-center bg-white/60 text-sm font-semibold dark:bg-black/50">{locale === "en" ? "Out of stock" : "Rupture"}</div>}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-[13.5px] font-medium leading-snug">{p.title}</h3>
        <Price p={p} currency={p.currency} locale={locale} size="sm" />
        <div className="mt-auto flex items-center gap-1 text-[11.5px] muted">
          <span className="truncate">{p.shop.name}</span>
          {p.shop.verification === "VERIFIED" && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-night-500 dark:text-night-300" aria-label="Boutique vérifiée" />}
        </div>
        {p.shop.city && (
          <div className="flex items-center gap-1 text-[11.5px] muted"><MapPin className="h-3 w-3" />{p.shop.city.name} {p.shop.country.flag}</div>
        )}
      </div>
    </Link>
  );
}

export function ProductGrid({ items, locale }: { items: ProductCardData[]; locale?: string }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {items.map((p, i) => <ProductCard key={p.id} p={p} locale={locale} priority={i < 4} />)}
    </div>
  );
}

export function ProductRow({ items, locale }: { items: ProductCardData[]; locale?: string }) {
  return (
    <div className="scroll-row -mx-4 px-4 sm:mx-0 sm:px-0">
      {items.map((p) => (
        <div key={p.id} className="w-[44%] shrink-0 sm:w-[30%] md:w-[23%] lg:w-[18%]"><ProductCard p={p} locale={locale} /></div>
      ))}
    </div>
  );
}

export function ProductGridSkeleton({ n = 12 }: { n?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="card overflow-hidden"><div className="skeleton aspect-square rounded-none" /><div className="space-y-2 p-3"><div className="skeleton h-3" /><div className="skeleton h-3 w-2/3" /><div className="skeleton h-4 w-1/2" /></div></div>
      ))}
    </div>
  );
}
