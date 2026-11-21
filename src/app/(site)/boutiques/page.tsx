import Link from "next/link";
import { getI18n } from "@/i18n";
import { getLocation } from "@/server/location";
import { listShops } from "@/server/modules/catalog/queries";
import { SiteShell } from "@/components/layout/SiteShell";
import { ShopCard } from "@/components/shop/ShopCard";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = { title: "Boutiques" };

export default async function ShopsPage({ searchParams }: { searchParams: Promise<{ q?: string; verified?: string; page?: string }> }) {
  const sp = await searchParams;
  const { tx, locale } = await getI18n();
  const loc = await getLocation();
  const page = Math.max(1, Number(sp.page) || 1);
  const shops = await listShops({
    ...(loc.country ? { countryCode: loc.country } : {}),
    ...(sp.verified ? { verification: "VERIFIED" } : {}),
    ...(sp.q ? { name: { contains: sp.q.slice(0, 60), mode: "insensitive" } } : {}),
  }, 25 * page, loc.cityId ? [{ visitCount: "desc" }] : [{ verification: "desc" }, { visitCount: "desc" }]);
  // Les boutiques de la ville choisie passent en premier
  const sorted = loc.cityId ? [...shops].sort((a, b) => Number(b.city?.name === loc.cityData?.name) - Number(a.city?.name === loc.cityData?.name)) : shops;
  const visible = sorted.slice(0, 24 * page);
  return (
    <SiteShell>
      <div className="container-x py-8">
        <h1 className="text-3xl font-extrabold">{tx("Les boutiques", "Shops")}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <form className="flex-1"><input name="q" defaultValue={sp.q} placeholder={tx("Rechercher une boutique", "Search a shop")} className="input max-w-md" /></form>
          <Link href="/boutiques" className={`chip ${!sp.verified ? "chip-active" : ""}`}>{tx("Toutes", "All")}</Link>
          <Link href="/boutiques?verified=1" className={`chip ${sp.verified ? "chip-active" : ""}`}>{tx("Vérifiées", "Verified")}</Link>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{visible.map((s) => <ShopCard key={s.id} s={s} locale={locale} />)}</div>
        {visible.length === 0 && <EmptyState title={tx("Aucune boutique pour le moment.", "No shops yet.")} />}
        {shops.length > visible.length && <div className="mt-8 text-center"><Link href={`?page=${page + 1}${sp.verified ? "&verified=1" : ""}`} className="btn-dark" scroll={false}>{tx("Voir plus", "Load more")}</Link></div>}
      </div>
    </SiteShell>
  );
}
