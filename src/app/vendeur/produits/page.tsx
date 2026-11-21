import Image from "next/image";
import Link from "next/link";
import { Copy, Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { requireShop } from "@/server/auth/guards";
import { getShopEntitlements } from "@/server/modules/subscriptions/service";
import { PageTitle } from "@/components/dashboard/DashShell";
import { Price } from "@/components/ui/Price";
import { EmptyState } from "@/components/ui/EmptyState";
import { deleteProductAction, duplicateProductAction, publishAllDraftsAction, toggleAvailabilityAction } from "@/app/actions/seller";

const STATUS: Record<string, [string, string]> = {
  ACTIVE: ["Publié", "bg-wa-500/15 text-wa-600"], DRAFT: ["Brouillon", "bg-[rgb(var(--surface-2))] muted"], UNAVAILABLE: ["Indisponible", "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"],
  PENDING_REVIEW: ["En modération", "bg-gold-400/25 text-amber-800 dark:text-gold-400"], REJECTED: ["Refusé", "bg-red-100 text-red-700"],
};

export default async function SellerProducts({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; ok?: string }> }) {
  const { shop } = await requireShop();
  const sp = await searchParams;
  const where: Prisma.ProductWhereInput = {
    shopId: shop.id, deletedAt: null,
    ...(sp.status ? { status: sp.status as Prisma.EnumProductStatusFilter["equals"] } : {}),
    ...(sp.q ? { title: { contains: sp.q, mode: "insensitive" } } : {}),
  };
  const [products, ent, total, drafts] = await Promise.all([
    db.product.findMany({ where, orderBy: { updatedAt: "desc" }, take: 200, include: { images: { take: 1, orderBy: { position: "asc" } }, _count: { select: { variants: true } } } }),
    getShopEntitlements(shop.id), db.product.count({ where: { shopId: shop.id, deletedAt: null } }),
    db.product.count({ where: { shopId: shop.id, deletedAt: null, status: "DRAFT" } }),
  ]);
  const max = ent.features.maxProducts;
  return (
    <>
      <PageTitle title="Mes produits" subtitle={`${total} produit(s)${max ? ` sur ${max} autorisés par votre offre` : ""}`}>
        {drafts > 0 && <form action={publishAllDraftsAction}><button className="btn-ghost">Publier les brouillons avec photo ({drafts})</button></form>}
        <Link href="/vendeur/produits/nouveau" className="btn-primary"><Plus className="h-4 w-4" />Ajouter</Link>
      </PageTitle>
      {sp.ok && <p className="mb-4 rounded-xl bg-wa-500/10 p-3 text-sm text-wa-600">Produit {sp.ok === "cree" ? "créé" : "mis à jour"} avec succès.</p>}
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Rechercher…" className="input max-w-xs" />
        <select name="status" defaultValue={sp.status ?? ""} className="input w-auto"><option value="">Tous statuts</option>{Object.entries(STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select>
        <button className="btn-dark">Filtrer</button>
      </form>
      {products.length === 0 ? <EmptyState title="Aucun produit."><Link href="/vendeur/produits/nouveau" className="font-semibold text-brand-600">Ajoutez votre premier produit</Link></EmptyState> : (
        <div className="card divide-y divide-[rgb(var(--border))]">
          {products.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[rgb(var(--surface-2))]">{p.images[0] && <Image src={p.images[0].url} alt="" fill sizes="56px" className="object-cover" />}</div>
              <div className="min-w-0 flex-1">
                <Link href={`/vendeur/produits/${p.id}`} className="line-clamp-1 font-medium hover:underline">{p.title}</Link>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs">
                  <Price p={p} currency={p.currency} size="sm" />
                  <span className={`badge ${STATUS[p.status][1]}`}>{STATUS[p.status][0]}</span>
                  <span className="muted">Stock : {p.stock ?? "∞"}{p._count.variants ? ` · ${p._count.variants} variantes` : ""} · {p.viewCount} vues</span>
                </div>
                {p.moderationNote && <p className="mt-1 text-xs text-red-600">Modération : {p.moderationNote}</p>}
              </div>
              <div className="flex shrink-0 items-center">
                <Link href={`/vendeur/produits/${p.id}`} className="p-2 hover:text-brand-600" aria-label="Modifier"><Pencil className="h-4 w-4" /></Link>
                <form action={toggleAvailabilityAction}><input type="hidden" name="id" value={p.id} /><button className="p-2 hover:text-brand-600" aria-label={p.status === "ACTIVE" ? "Rendre indisponible" : "Publier"}>{p.status === "ACTIVE" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></form>
                <form action={duplicateProductAction}><input type="hidden" name="id" value={p.id} /><button className="hidden p-2 hover:text-brand-600 sm:block" aria-label="Dupliquer"><Copy className="h-4 w-4" /></button></form>
                <form action={deleteProductAction}><input type="hidden" name="id" value={p.id} /><button className="p-2 hover:text-red-600" aria-label="Supprimer"><Trash2 className="h-4 w-4" /></button></form>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
