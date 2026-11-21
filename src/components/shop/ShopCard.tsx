import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, MapPin } from "lucide-react";
import type { ShopCardData } from "@/server/modules/catalog/queries";

export function ShopCard({ s, locale = "fr" }: { s: ShopCardData; locale?: string }) {
  return (
    <Link href={`/boutique/${s.slug}`} className="group card block snap-start overflow-hidden transition hover:-translate-y-1 hover:shadow-lift">
      <div className="relative h-24 overflow-hidden" style={{ background: s.accentColor }}>
        {s.coverUrl && <Image src={s.coverUrl} alt="" fill sizes="320px" className="object-cover opacity-90 transition duration-500 group-hover:scale-105" />}
      </div>
      <div className="relative px-4 pb-4">
        <div className="-mt-8 mb-2 h-16 w-16 overflow-hidden rounded-2xl border-4 border-[rgb(var(--surface))] bg-[rgb(var(--surface-2))] shadow">
          {s.logoUrl ? <Image src={s.logoUrl} alt={s.name} width={64} height={64} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center font-display text-xl font-bold">{s.name[0]}</div>}
        </div>
        <div className="flex items-center gap-1.5">
          <h3 className="truncate font-semibold">{s.name}</h3>
          {s.verification === "VERIFIED" && <BadgeCheck className="h-4 w-4 shrink-0 text-night-500 dark:text-night-300" aria-label="Vérifiée" />}
        </div>
        {s.tagline && <p className="mt-0.5 line-clamp-1 text-sm muted">{s.tagline}</p>}
        <div className="mt-2 flex items-center justify-between text-xs muted">
          <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{s.city?.name ?? (locale === "en" ? s.country.nameEn : s.country.nameFr)} {s.country.flag}</span>
          <span>{s._count.products} {locale === "en" ? "products" : "produits"}</span>
        </div>
      </div>
    </Link>
  );
}

export function ShopRow({ items, locale }: { items: ShopCardData[]; locale?: string }) {
  return (
    <div className="scroll-row -mx-4 px-4 sm:mx-0 sm:px-0">
      {items.map((s) => <div key={s.id} className="w-[72%] shrink-0 sm:w-[40%] md:w-[30%] lg:w-[23%]"><ShopCard s={s} locale={locale} /></div>)}
    </div>
  );
}
