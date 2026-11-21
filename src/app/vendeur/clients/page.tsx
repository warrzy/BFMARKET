import { db } from "@/server/db";
import { requireShop } from "@/server/auth/guards";
import { PageTitle } from "@/components/dashboard/DashShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatPrice } from "@/lib/money";
import { formatPhoneInternational } from "@/lib/phone";
import { waLink } from "@/lib/whatsapp";

export default async function Clients() {
  const { shop } = await requireShop();
  // Clients agrégés à partir des commandes reçues par CETTE boutique uniquement.
  const rows = await db.$queryRaw<{ phone: string; name: string; city: string; orders: bigint; total: bigint; last: Date }[]>`
    SELECT o."buyerPhone" AS phone, MAX(o."buyerName") AS name, MAX(o."city") AS city, COUNT(s.id)::bigint AS orders,
           COALESCE(SUM(s.total) FILTER (WHERE s.status <> 'CANCELLED'), 0)::bigint AS total, MAX(s."createdAt") AS last
    FROM "SubOrder" s JOIN "Order" o ON o.id = s."orderId"
    WHERE s."shopId" = ${shop.id}
    GROUP BY o."buyerPhone" ORDER BY last DESC LIMIT 300`;
  return (
    <>
      <PageTitle title="Clients" subtitle="Les personnes qui ont commandé dans votre boutique. Utilisez ces données uniquement pour le suivi de leurs commandes." />
      {rows.length === 0 ? <EmptyState title="Pas encore de clients." /> : (
        <div className="card overflow-x-auto">
          <table className="table-x min-w-[560px]">
            <thead><tr><th>Client</th><th>Ville</th><th>Commandes</th><th>Total</th><th>Dernière</th><th></th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.phone}><td className="font-medium">{r.name}<div className="text-xs muted">{formatPhoneInternational(r.phone)}</div></td><td>{r.city}</td><td>{Number(r.orders)}</td>
                <td>{formatPrice(Number(r.total), shop.country.currency)}</td><td className="text-xs">{new Date(r.last).toLocaleDateString("fr-FR")}</td>
                <td><a href={waLink(r.phone)} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-wa-600">WhatsApp</a></td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </>
  );
}
