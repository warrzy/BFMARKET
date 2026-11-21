import Link from "next/link";
import { requireShop } from "@/server/auth/guards";
import { getShopEntitlements } from "@/server/modules/subscriptions/service";
import { shopDailySeries, topProducts } from "@/server/modules/shops/stats";
import { shopFinancials } from "@/server/modules/orders/service";
import { PageTitle, Stat } from "@/components/dashboard/DashShell";
import { Bars } from "@/components/dashboard/Bars";
import { formatPrice } from "@/lib/money";

export default async function Stats({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { shop } = await requireShop();
  const ent = await getShopEntitlements(shop.id);
  const requested = Number((await searchParams).days) || 30;
  const days = ent.features.advancedStats ? Math.min(Math.max(requested, 7), 365) : 7;
  const since = new Date(Date.now() - days * 86400_000);
  const [series, top, fin] = await Promise.all([shopDailySeries(shop.id, days), topProducts(shop.id, 10), shopFinancials(shop.id, since)]);
  const cur = shop.country.currency;
  const visits = series.reduce((s, d) => s + d.visits, 0);
  return (
    <>
      <PageTitle title="Statistiques" subtitle={`${days} derniers jours`}>
        {ent.features.advancedStats ? [7, 30, 90, 365].map((d) => <Link key={d} href={`?days=${d}`} className={`chip ${d === days ? "chip-active" : ""}`}>{d} j</Link>)
          : <Link href="/vendeur/abonnement" className="btn-ghost text-xs">Statistiques avancées : offre Pro</Link>}
      </PageTitle>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Visites" value={visits} />
        <Stat label="Commandes" value={fin.ordersCount} hint={`${fin.cancelledCount} annulée(s)`} />
        <Stat label="Valeur des commandes" value={formatPrice(fin.ordersValue, cur)} accent="night" />
        <Stat label="Encaissé (vérifié)" value={formatPrice(fin.paidValue, cur)} accent="green" />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card p-5"><h2 className="mb-4 font-bold">Visites</h2><Bars data={series.map((d) => ({ key: d.key, label: d.label, value: d.visits }))} label="Visites" /></div>
        <div className="card p-5"><h2 className="mb-4 font-bold">Commandes (valeur)</h2><Bars data={series.map((d) => ({ key: d.key, label: d.label, value: d.revenue }))} label="Valeur des commandes" format={(n) => formatPrice(n, cur)} /></div>
      </div>
      <div className="card mt-6 p-5">
        <h2 className="mb-3 font-bold">Meilleures ventes</h2>
        <table className="table-x"><thead><tr><th>Produit</th><th>Vendus</th><th>Vues</th><th>Valeur</th></tr></thead>
          <tbody>{top.map((p) => <tr key={p.id}><td>{p.title}</td><td>{p.sold}</td><td>{p.viewCount}</td><td>{formatPrice(p.revenue, cur)}</td></tr>)}</tbody></table>
        {top.length === 0 && <p className="py-4 text-center text-sm muted">Pas encore de ventes.</p>}
      </div>
    </>
  );
}
