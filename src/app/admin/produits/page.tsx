import Image from "next/image";
import Link from "next/link";
import type { ProductStatus } from "@prisma/client";
import { db } from "@/server/db";
import { countryScope, requireAdmin } from "@/server/auth/guards";
import { PageTitle } from "@/components/dashboard/DashShell";
import { moderateProductAction } from "@/app/actions/admin";
import { formatPrice } from "@/lib/money";

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const cs = countryScope(admin);
  const status = (["PENDING_REVIEW", "ACTIVE", "REJECTED", "UNAVAILABLE"].includes(sp.status ?? "") ? sp.status : "PENDING_REVIEW") as ProductStatus;
  const products = await db.product.findMany({
    where: { status, deletedAt: null, shop: cs ? { countryCode: cs } : {}, ...(sp.q ? { title: { contains: sp.q, mode: "insensitive" } } : {}) },
    orderBy: { createdAt: "desc" }, take: 60, include: { shop: true, images: { take: 1 } },
  });
  return (
    <>
      <PageTitle title="Modération des produits" subtitle="Mode de modération réglable dans les paramètres globaux (a priori / a posteriori)." />
      <div className="scroll-row mb-4">{[["PENDING_REVIEW", "À modérer"], ["ACTIVE", "Publiés"], ["REJECTED", "Refusés"], ["UNAVAILABLE", "Masqués"]].map(([k, l]) => <Link key={k} href={`?status=${k}`} className={`chip ${status === k ? "chip-active" : ""}`}>{l}</Link>)}</div>
      <form className="mb-4 flex gap-2"><input type="hidden" name="status" value={status} /><input name="q" defaultValue={sp.q} placeholder="Titre…" className="input max-w-xs" /><button className="btn-dark">Rechercher</button></form>
      <div className="grid gap-3 md:grid-cols-2">
        {products.map((p) => (
          <div key={p.id} className="card flex gap-3 p-3">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[rgb(var(--surface-2))]">{p.images[0] && <Image src={p.images[0].url} alt="" fill sizes="80px" className="object-cover" />}</div>
            <div className="min-w-0 flex-1">
              <Link href={`/produit/${p.slug}`} target="_blank" className="line-clamp-1 font-medium hover:underline">{p.title}</Link>
              <p className="text-xs muted">{p.shop.name} · {formatPrice(p.price, p.currency)}</p>
              <p className="line-clamp-2 text-xs muted">{p.description}</p>
              <form className="mt-2 flex flex-wrap gap-1">
                <input type="hidden" name="id" value={p.id} />
                <input name="note" placeholder="Motif" className="input w-32 py-1 text-xs" />
                {p.status !== "ACTIVE" && <button formAction={moderateProductAction.bind(null, "approve")} className="btn-primary px-2 py-1 text-xs">Approuver</button>}
                {p.status !== "REJECTED" && <button formAction={moderateProductAction.bind(null, "reject")} className="btn-danger px-2 py-1 text-xs">Refuser</button>}
                {p.status === "ACTIVE" && <button formAction={moderateProductAction.bind(null, "hide")} className="btn-ghost px-2 py-1 text-xs">Masquer</button>}
              </form>
            </div>
          </div>
        ))}
      </div>
      {products.length === 0 && <p className="card p-6 text-center text-sm muted">Rien à afficher.</p>}
    </>
  );
}
