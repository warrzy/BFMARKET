import { db } from "@/server/db";
import { requireAdmin, countryScope } from "@/server/auth/guards";
import { PageTitle, Stat } from "@/components/dashboard/DashShell";
import { formatPrice } from "@/lib/money";

export default async function AdminHome() {
  const admin = await requireAdmin();
  const cs = countryScope(admin);
  const shopScope = cs ? { countryCode: cs } : {};
  const since = new Date(Date.now() - 30 * 86400_000);
  const [users, shops, activeShops, products, orders30, subs, byCountry, newShops] = await Promise.all([
    db.user.count({ where: cs ? { countryCode: cs } : {} }),
    db.shop.count({ where: shopScope }),
    db.shop.count({ where: { ...shopScope, status: "ACTIVE" } }),
    db.product.count({ where: { deletedAt: null, status: "ACTIVE", shop: shopScope } }),
    db.subOrder.count({ where: { createdAt: { gte: since }, shop: shopScope } }),
    db.subscription.groupBy({ by: ["planId"], where: { current: true, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] }, shop: shopScope }, _count: true }),
    db.$queryRaw<{ code: string; flag: string; name: string; active: boolean; shops: bigint; products: bigint; orders: bigint; value: bigint; currency: string }[]>`
      SELECT c.code, c.flag, c."nameFr" AS name, c.active, c.currency,
        (SELECT COUNT(*) FROM "Shop" s WHERE s."countryCode" = c.code AND s.status = 'ACTIVE')::bigint AS shops,
        (SELECT COUNT(*) FROM "Product" p JOIN "Shop" s ON s.id = p."shopId" WHERE s."countryCode" = c.code AND p.status = 'ACTIVE' AND p."deletedAt" IS NULL)::bigint AS products,
        (SELECT COUNT(*) FROM "SubOrder" so JOIN "Shop" s ON s.id = so."shopId" WHERE s."countryCode" = c.code AND so."createdAt" >= ${since})::bigint AS orders,
        (SELECT COALESCE(SUM(so.total),0) FROM "SubOrder" so JOIN "Shop" s ON s.id = so."shopId" WHERE s."countryCode" = c.code AND so."createdAt" >= ${since} AND so.status <> 'CANCELLED')::bigint AS value
      FROM "Country" c ORDER BY c."sortOrder"`,
    db.shop.count({ where: { ...shopScope, createdAt: { gte: since } } }),
  ]);
  const plans = await db.plan.findMany();
  const rows = byCountry.filter((r) => !cs || cs.in.includes(r.code));
  return (
    <>
      <PageTitle title="Tableau de bord global" subtitle="30 derniers jours" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Utilisateurs" value={users} />
        <Stat label="Boutiques actives" value={`${activeShops} / ${shops}`} hint={`+${newShops} ce mois`} accent="brand" />
        <Stat label="Produits en ligne" value={products} />
        <Stat label="Sous-commandes (30 j)" value={orders30} accent="green" />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {plans.map((p) => <Stat key={p.id} label={`Abonnés ${p.nameFr}`} value={subs.find((s) => s.planId === p.id)?._count ?? 0} accent="gold" />)}
      </div>
      <section className="card mt-6 overflow-x-auto p-5">
        <h2 className="mb-3 font-bold">Statistiques par pays</h2>
        <table className="table-x min-w-[640px]"><thead><tr><th>Pays</th><th>Statut</th><th>Boutiques</th><th>Produits</th><th>Commandes 30 j</th><th>Valeur 30 j</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.code}><td>{r.flag} {r.name}</td><td>{r.active ? <span className="badge bg-wa-500/15 text-wa-600">Actif</span> : <span className="badge bg-[rgb(var(--surface-2))] muted">Inactif</span>}</td>
              <td>{Number(r.shops)}</td><td>{Number(r.products)}</td><td>{Number(r.orders)}</td><td>{formatPrice(Number(r.value), r.currency)}</td></tr>
          ))}</tbody></table>
        <p className="mt-2 text-xs muted">Valeurs dans la devise de chaque pays, sans conversion.</p>
      </section>
    </>
  );
}
