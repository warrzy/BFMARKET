import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { countryScope, requireAdmin } from "@/server/auth/guards";
import { PageTitle } from "@/components/dashboard/DashShell";
import { PaymentBadge, StatusBadge } from "@/components/dashboard/Badges";
import { adminSetOrderPaymentAction } from "@/app/actions/admin";
import { formatPrice } from "@/lib/money";

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const cs = countryScope(admin);
  const where: Prisma.SubOrderWhereInput = {
    ...(cs ? { shop: { countryCode: cs } } : {}),
    ...(sp.q ? { OR: [{ reference: { contains: sp.q.toUpperCase() } }, { order: { buyerPhone: { contains: sp.q.replace(/\s/g, "") } } }] } : {}),
  };
  const orders = await db.subOrder.findMany({ where, orderBy: { createdAt: "desc" }, take: 100, include: { shop: true, order: true } });
  return (
    <>
      <PageTitle title="Commandes" subtitle="Vue globale des sous-commandes. Intervention sur le paiement réservée aux litiges, journalisée." />
      <form className="mb-4 flex gap-2"><input name="q" defaultValue={sp.q} placeholder="Référence ou téléphone" className="input max-w-xs" /><button className="btn-dark">Rechercher</button></form>
      <div className="card overflow-x-auto">
        <table className="table-x min-w-[820px]"><thead><tr><th>Référence</th><th>Boutique</th><th>Client</th><th>Total</th><th>Statut</th><th>Paiement</th><th>Action</th></tr></thead>
          <tbody>{orders.map((o) => (
            <tr key={o.id}><td className="font-mono text-xs">{o.reference}<div className="muted">{o.createdAt.toLocaleDateString("fr-FR")}</div></td><td>{o.shop.name}</td><td>{o.order.buyerName}<div className="text-xs muted">{o.order.city}</div></td>
              <td>{formatPrice(o.total, o.currency)}</td><td><StatusBadge s={o.status} /></td><td><PaymentBadge s={o.paymentStatus} /><div className="text-xs muted">{o.paymentMethod}</div></td>
              <td>{admin.role !== "COUNTRY_ADMIN" && <form action={adminSetOrderPaymentAction} className="flex gap-1"><input type="hidden" name="id" value={o.id} />
                <select name="paymentStatus" defaultValue="" className="input w-28 py-1 text-xs"><option value="" disabled>Paiement…</option><option value="PAID">Payée</option><option value="UNPAID">Non payée</option><option value="REFUNDED">Remboursée</option></select>
                <button className="btn-ghost px-2 py-1 text-xs">OK</button></form>}</td></tr>
          ))}</tbody></table>
      </div>
    </>
  );
}
