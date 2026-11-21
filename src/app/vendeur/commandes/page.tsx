import Link from "next/link";
import type { Prisma, SubOrderStatus } from "@prisma/client";
import { db } from "@/server/db";
import { requireShop } from "@/server/auth/guards";
import { PageTitle } from "@/components/dashboard/DashShell";
import { PaymentBadge, StatusBadge } from "@/components/dashboard/Badges";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatPrice } from "@/lib/money";
import fr from "@/i18n/fr";

const STATUSES = Object.keys(fr.status) as SubOrderStatus[];

export default async function SellerOrders({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  const { shop } = await requireShop();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.SubOrderWhereInput = {
    shopId: shop.id,
    ...(STATUSES.includes(sp.status as SubOrderStatus) ? { status: sp.status as SubOrderStatus } : {}),
    ...(sp.q ? { OR: [{ reference: { contains: sp.q, mode: "insensitive" } }, { order: { buyerName: { contains: sp.q, mode: "insensitive" } } }, { order: { buyerPhone: { contains: sp.q.replace(/\s/g, "") } } }] } : {}),
  };
  const [orders, counts] = await Promise.all([
    db.subOrder.findMany({ where, orderBy: { createdAt: "desc" }, take: 30, skip: (page - 1) * 30, include: { order: true, _count: { select: { items: true } } } }),
    db.subOrder.groupBy({ by: ["status"], where: { shopId: shop.id }, _count: true }),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  return (
    <>
      <PageTitle title="Mes commandes" subtitle="Confirmez rapidement : les clients apprécient une réponse dans l'heure." />
      <div className="scroll-row mb-4">
        <Link href="/vendeur/commandes" className={`chip ${!sp.status ? "chip-active" : ""}`}>Toutes</Link>
        {STATUSES.map((s) => <Link key={s} href={`?status=${s}`} className={`chip ${sp.status === s ? "chip-active" : ""}`}>{fr.status[s]} ({count(s)})</Link>)}
      </div>
      <form className="mb-4 flex gap-2"><input name="q" defaultValue={sp.q} placeholder="Référence, nom ou téléphone du client" className="input max-w-sm" />{sp.status && <input type="hidden" name="status" value={sp.status} />}<button className="btn-dark">Rechercher</button></form>
      {orders.length === 0 ? <EmptyState title="Aucune commande." /> : (
        <div className="card overflow-x-auto">
          <table className="table-x min-w-[640px]">
            <thead><tr><th>Commande</th><th>Client</th><th>Articles</th><th>Total</th><th>Statut</th><th>Paiement</th></tr></thead>
            <tbody>{orders.map((o) => (
              <tr key={o.id} className="hover:bg-[rgb(var(--surface-2))]">
                <td><Link href={`/vendeur/commandes/${o.id}`} className="font-semibold text-brand-600">{o.reference}</Link><div className="text-xs muted">{o.createdAt.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}{o.order.channel === "WHATSAPP" ? " · WhatsApp" : ""}</div></td>
                <td>{o.order.buyerName}<div className="text-xs muted">{o.order.city}</div></td>
                <td>{o._count.items}</td>
                <td className="font-semibold">{formatPrice(o.total, o.currency)}</td>
                <td><StatusBadge s={o.status} /></td>
                <td><PaymentBadge s={o.paymentStatus} /></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <div className="mt-4 flex justify-center gap-2">
        {page > 1 && <Link href={`?page=${page - 1}${sp.status ? `&status=${sp.status}` : ""}`} className="btn-ghost">Précédent</Link>}
        {orders.length === 30 && <Link href={`?page=${page + 1}${sp.status ? `&status=${sp.status}` : ""}`} className="btn-ghost">Suivant</Link>}
      </div>
    </>
  );
}
