import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { countryScope, requireAdmin } from "@/server/auth/guards";
import { PageTitle } from "@/components/dashboard/DashShell";
import { setShopStatusAction, verifyShopAction } from "@/app/actions/admin";
import { formatPhoneInternational } from "@/lib/phone";

export default async function AdminShops({ searchParams }: { searchParams: Promise<{ q?: string; v?: string; status?: string }> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const cs = countryScope(admin);
  const where: Prisma.ShopWhereInput = {
    ...(cs ? { countryCode: cs } : {}),
    ...(sp.v ? { verification: sp.v as Prisma.ShopWhereInput["verification"] } : {}),
    ...(sp.status ? { status: sp.status as Prisma.ShopWhereInput["status"] } : {}),
    ...(sp.q ? { OR: [{ name: { contains: sp.q, mode: "insensitive" } }, { slug: { contains: sp.q } }, { whatsapp: { contains: sp.q } }] } : {}),
  };
  const shops = await db.shop.findMany({
    where, orderBy: [{ verification: "asc" }, { createdAt: "desc" }], take: 100,
    include: { city: true, country: true, members: { where: { role: "OWNER" }, include: { user: true } }, subscriptions: { where: { current: true }, include: { plan: true } }, _count: { select: { products: true, subOrders: true } } },
  });
  return (
    <>
      <PageTitle title="Vendeurs & boutiques" />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Nom, slug, WhatsApp" className="input max-w-xs" />
        <select name="v" defaultValue={sp.v ?? ""} className="input w-auto"><option value="">Vérification : toutes</option><option value="PENDING">En attente</option><option value="VERIFIED">Vérifiées</option><option value="NONE">Non demandées</option><option value="REJECTED">Refusées</option></select>
        <select name="status" defaultValue={sp.status ?? ""} className="input w-auto"><option value="">Statut : tous</option><option value="ACTIVE">Active</option><option value="DRAFT">Brouillon</option><option value="SUSPENDED">Suspendue</option></select>
        <button className="btn-dark">Filtrer</button>
      </form>
      <div className="space-y-3">
        {shops.map((s) => (
          <div key={s.id} className="card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link href={`/boutique/${s.slug}`} target="_blank" className="font-bold hover:underline">{s.name}</Link>
                <span className="ml-2 text-xs muted">{s.country.flag} {s.city?.name} · {s._count.products} produits · {s._count.subOrders} commandes · {s.subscriptions[0]?.plan.code ?? "—"}</span>
                <p className="text-xs muted">Propriétaire : {s.members[0]?.user.name} · {s.whatsapp ? formatPhoneInternational(s.whatsapp) : s.members[0]?.user.email} · créée le {s.createdAt.toLocaleDateString("fr-FR")}</p>
              </div>
              <div className="flex gap-1 text-xs"><span className="badge bg-[rgb(var(--surface-2))]">{s.status}</span><span className={`badge ${s.verification === "VERIFIED" ? "bg-night-900 text-white" : s.verification === "PENDING" ? "bg-gold-400/30" : "bg-[rgb(var(--surface-2))]"}`}>{s.verification}</span></div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <form className="flex flex-wrap gap-2">
                <input type="hidden" name="id" value={s.id} />
                <input name="note" placeholder="Note (motif)" className="input w-48 py-1.5 text-sm" />
                {s.verification !== "VERIFIED" && <button formAction={verifyShopAction.bind(null, "VERIFIED")} className="btn-primary px-3 py-1.5 text-xs">Vérifier</button>}
                {s.verification === "PENDING" && <button formAction={verifyShopAction.bind(null, "REJECTED")} className="btn-ghost px-3 py-1.5 text-xs">Refuser</button>}
                {s.verification === "VERIFIED" && <button formAction={verifyShopAction.bind(null, "NONE")} className="btn-ghost px-3 py-1.5 text-xs">Retirer le badge</button>}
              </form>
              <form><input type="hidden" name="id" value={s.id} />
                {s.status === "SUSPENDED" ? <button formAction={setShopStatusAction.bind(null, "ACTIVE")} className="btn-ghost px-3 py-1.5 text-xs">Réactiver</button> : <button formAction={setShopStatusAction.bind(null, "SUSPENDED")} className="btn-danger px-3 py-1.5 text-xs">Suspendre</button>}
              </form>
            </div>
          </div>
        ))}
        {shops.length === 0 && <p className="card p-6 text-center text-sm muted">Aucune boutique.</p>}
      </div>
    </>
  );
}
