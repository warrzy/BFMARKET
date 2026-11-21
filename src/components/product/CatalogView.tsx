import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { getI18n } from "@/i18n";
import { db } from "@/server/db";
import { getLocation } from "@/server/location";
import { searchProducts, type SearchParams } from "@/server/modules/catalog/queries";
import { ProductGrid } from "./ProductCard";
import { EmptyState } from "@/components/ui/EmptyState";

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const TABS = ["all", "verified", "promo", "new", "near", "flash"] as const;
const SORTS = ["recent", "popular", "price_asc", "price_desc"] as const;

export function parseCatalogParams(sp: Raw): SearchParams {
  const tab = one(sp.tab) as SearchParams["tab"];
  const sort = one(sp.sort) as SearchParams["sort"];
  const type = one(sp.type);
  const num = (v: string) => (v && /^\d+$/.test(v) ? Number(v) : undefined);
  return {
    q: one(sp.q) || undefined,
    category: one(sp.category) || undefined,
    tab: TABS.includes(tab as never) ? tab : "all",
    sort: SORTS.includes(sort as never) ? sort : "recent",
    type: ["PHYSICAL", "DIGITAL", "SERVICE"].includes(type) ? (type as SearchParams["type"]) : undefined,
    minPrice: num(one(sp.min)),
    maxPrice: num(one(sp.max)),
    country: one(sp.country) || undefined,
    cityId: one(sp.city) || undefined,
    cursor: one(sp.cursor) || undefined,
  };
}

export async function CatalogView({ sp, fixedCategory, title }: { sp: Raw; fixedCategory?: string; title: string }) {
  const { m, tx, locale } = await getI18n();
  const loc = await getLocation();
  const params = parseCatalogParams(sp);
  if (fixedCategory) params.category = fixedCategory;
  // Localisation par défaut : celle choisie dans l'en-tête
  if (!params.country && loc.country) params.country = loc.country;
  if (params.tab === "near" && !params.cityId && loc.cityId) params.cityId = loc.cityId;

  const [{ items, nextCursor }, countries] = await Promise.all([
    searchProducts(params),
    db.country.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, include: { cities: { where: { active: true }, orderBy: { name: "asc" } } } }),
  ]);
  const cities = countries.find((c) => c.code === params.country)?.cities ?? [];

  const qs = (patch: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    const base: Record<string, string | undefined> = {
      q: params.q, tab: params.tab === "all" ? undefined : params.tab, sort: params.sort === "recent" ? undefined : params.sort,
      type: params.type, min: params.minPrice?.toString(), max: params.maxPrice?.toString(),
      country: one(sp.country) || undefined, city: one(sp.city) || undefined, category: fixedCategory ? undefined : params.category,
    };
    for (const [k, v] of Object.entries({ ...base, ...patch })) if (v) u.set(k, v);
    const s = u.toString();
    return s ? `?${s}` : "?";
  };

  const tabLabels: Record<(typeof TABS)[number], string> = {
    all: tx("Tous", "All"), verified: tx("Vérifiées", "Verified"), promo: tx("Promos", "Deals"),
    new: tx("Nouveautés", "New"), near: tx("Près de moi", "Near me"), flash: tx("Ventes flash", "Flash sales"),
  };

  return (
    <div className="container-x py-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
          {params.q && <p className="mt-1 text-sm muted">{tx("Résultats pour", "Results for")} « {params.q} »</p>}
        </div>
      </div>

      <div className="scroll-row mb-4">
        {TABS.map((t) => (
          <Link key={t} href={qs({ tab: t === "all" ? undefined : t, cursor: undefined })} className={`chip ${params.tab === t ? "chip-active" : ""}`}>{tabLabels[t]}</Link>
        ))}
      </div>

      <details className="card mb-6 open:pb-4 [&_summary::-webkit-details-marker]:hidden" open={!!(params.minPrice || params.maxPrice || params.type || one(sp.city))}>
        <summary className="flex cursor-pointer items-center gap-2 p-4 text-sm font-semibold"><SlidersHorizontal className="h-4 w-4" />{m.common.filters}</summary>
        <form className="grid gap-3 px-4 sm:grid-cols-2 lg:grid-cols-6" action="">
          {params.q && <input type="hidden" name="q" value={params.q} />}
          {params.tab !== "all" && <input type="hidden" name="tab" value={params.tab} />}
          <select name="country" defaultValue={params.country ?? ""} className="input" aria-label="Pays">
            <option value="">{m.nav.allCountries}</option>
            {countries.map((c) => <option key={c.code} value={c.code}>{c.flag} {locale === "en" ? c.nameEn : c.nameFr}</option>)}
          </select>
          <select name="city" defaultValue={params.cityId ?? ""} className="input" aria-label="Ville">
            <option value="">{m.nav.allCities}</option>
            {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select name="type" defaultValue={params.type ?? ""} className="input" aria-label="Type">
            <option value="">{tx("Tous types", "All types")}</option>
            <option value="PHYSICAL">{tx("Produits physiques", "Physical products")}</option>
            <option value="DIGITAL">{tx("Produits numériques", "Digital products")}</option>
            <option value="SERVICE">{tx("Services", "Services")}</option>
          </select>
          <input name="min" inputMode="numeric" placeholder={tx("Prix min", "Min price")} defaultValue={params.minPrice} className="input" />
          <input name="max" inputMode="numeric" placeholder={tx("Prix max", "Max price")} defaultValue={params.maxPrice} className="input" />
          <select name="sort" defaultValue={params.sort} className="input" aria-label={m.common.sort}>
            <option value="recent">{tx("Plus récents", "Newest")}</option>
            <option value="popular">{tx("Populaires", "Popular")}</option>
            <option value="price_asc">{tx("Prix croissant", "Price: low to high")}</option>
            <option value="price_desc">{tx("Prix décroissant", "Price: high to low")}</option>
          </select>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-6">
            <button className="btn-primary">{m.common.apply}</button>
            <Link href="?" className="btn-ghost">{m.common.reset}</Link>
          </div>
        </form>
      </details>

      {items.length ? (
        <>
          <ProductGrid items={items} locale={locale} />
          <div className="mt-8 flex justify-center gap-3">
            {params.cursor && <Link href={qs({})} className="btn-ghost">{tx("Début", "First page")}</Link>}
            {nextCursor && <Link href={qs({ cursor: nextCursor })} className="btn-dark" scroll={false}>{m.common.loadMore}</Link>}
          </div>
        </>
      ) : (
        <EmptyState title={m.common.noResults}>
          {tx("Essayez d'élargir la zone ou de retirer des filtres.", "Try widening the area or removing filters.")}
        </EmptyState>
      )}
    </div>
  );
}
