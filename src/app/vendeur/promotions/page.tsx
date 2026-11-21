import Link from "next/link";
import { db } from "@/server/db";
import { requireShop } from "@/server/auth/guards";
import { getShopEntitlements } from "@/server/modules/subscriptions/service";
import { activePromoWhere } from "@/server/modules/catalog/queries";
import { PageTitle } from "@/components/dashboard/DashShell";
import { CouponForm } from "@/components/seller/Forms";
import { toggleCouponAction } from "@/app/actions/seller";
import { formatPrice } from "@/lib/money";

export default async function Promotions() {
  const { shop } = await requireShop();
  const [ent, coupons, promos] = await Promise.all([
    getShopEntitlements(shop.id),
    db.coupon.findMany({ where: { shopId: shop.id }, orderBy: { createdAt: "desc" } }),
    db.product.findMany({ where: { shopId: shop.id, deletedAt: null, ...activePromoWhere() }, select: { id: true, title: true, price: true, promoPrice: true, promoEndsAt: true, currency: true } }),
  ]);
  return (
    <>
      <PageTitle title="Promotions" subtitle="Prix promotionnels planifiés et codes de réduction." />
      {!ent.features.promotions && <div className="card mb-6 p-4 text-sm">Les promotions sont incluses dans les offres Pro et Business. <Link href="/vendeur/abonnement" className="font-semibold text-brand-600">Voir les offres</Link></div>}
      <section className="card mb-6 p-5">
        <h2 className="mb-3 font-bold">Produits en promotion ({promos.length})</h2>
        {promos.length === 0 ? <p className="text-sm muted">Définissez un prix promotionnel et des dates dans la fiche d&apos;un produit.</p> : (
          <ul className="divide-y divide-[rgb(var(--border))] text-sm">{promos.map((p) => (
            <li key={p.id} className="flex justify-between gap-3 py-2"><Link href={`/vendeur/produits/${p.id}`} className="truncate hover:underline">{p.title}</Link>
              <span className="shrink-0"><s className="muted">{formatPrice(p.price, p.currency)}</s> <b className="text-brand-600">{formatPrice(p.promoPrice!, p.currency)}</b>{p.promoEndsAt && <span className="text-xs muted"> · fin {p.promoEndsAt.toLocaleDateString("fr-FR")}</span>}</span></li>
          ))}</ul>
        )}
      </section>
      <section className="card mb-6 p-5"><h2 className="mb-3 font-bold">Nouveau code promo</h2><CouponForm /></section>
      <section className="card p-5">
        <h2 className="mb-3 font-bold">Codes promo</h2>
        {coupons.length === 0 ? <p className="text-sm muted">Aucun code.</p> : (
          <table className="table-x"><thead><tr><th>Code</th><th>Réduction</th><th>Utilisations</th><th>Validité</th><th></th></tr></thead>
            <tbody>{coupons.map((c) => (
              <tr key={c.id}><td className="font-mono font-bold">{c.code}</td><td>{c.percentOff ? `${c.percentOff} %` : formatPrice(c.amountOff ?? 0, c.currency ?? shop.country.currency)}</td>
                <td>{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ""}</td><td className="text-xs">{c.endsAt ? `jusqu'au ${c.endsAt.toLocaleDateString("fr-FR")}` : "Sans limite"}</td>
                <td><form action={toggleCouponAction}><input type="hidden" name="id" value={c.id} /><button className={`badge ${c.active ? "bg-wa-500/15 text-wa-600" : "bg-[rgb(var(--surface-2))] muted"}`}>{c.active ? "Actif" : "Inactif"}</button></form></td></tr>
            ))}</tbody></table>
        )}
      </section>
    </>
  );
}
