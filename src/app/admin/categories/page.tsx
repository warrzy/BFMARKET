import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/guards";
import { PageTitle } from "@/components/dashboard/DashShell";
import { CategoryForm } from "@/components/admin/Forms";
import { toggleCategoryAction } from "@/app/actions/admin";

export default async function AdminCategories() {
  await requireAdmin(["ADMIN", "SUPER_ADMIN"]);
  const cats = await db.category.findMany({ where: { parentId: null }, orderBy: { sortOrder: "asc" }, include: { children: { orderBy: { sortOrder: "asc" } }, _count: { select: { products: true } } } });
  const parents = cats.map((c) => ({ id: c.id, name: c.nameFr }));
  return (
    <>
      <PageTitle title="Catégories" subtitle="Catégories, sous-catégories et attributs/filtres spécifiques (JSON)." />
      <section className="card mb-6 p-5"><h2 className="mb-3 font-bold">Nouvelle catégorie</h2><CategoryForm parents={parents} /></section>
      <div className="space-y-3">
        {cats.map((c) => (
          <details key={c.id} className="card p-4">
            <summary className="flex cursor-pointer items-center justify-between gap-2">
              <span className={c.active ? "font-semibold" : "font-semibold muted line-through"}>{c.nameFr} <span className="text-xs font-normal muted">/{c.slug} · {c._count.products} produits · {c.children.length} sous-catégories</span></span>
              <form action={toggleCategoryAction}><input type="hidden" name="id" value={c.id} /><button className="text-xs font-semibold text-brand-600">{c.active ? "Désactiver" : "Activer"}</button></form>
            </summary>
            <div className="mt-4 space-y-4">
              <CategoryForm parents={parents.filter((p) => p.id !== c.id)} initial={c} />
              {c.children.map((s) => (
                <div key={s.id} className="border-l-2 border-[rgb(var(--border))] pl-3">
                  <div className="mb-1 flex items-center justify-between text-sm"><span className={s.active ? "" : "muted line-through"}>↳ {s.nameFr}</span>
                    <form action={toggleCategoryAction}><input type="hidden" name="id" value={s.id} /><button className="text-xs font-semibold text-brand-600">{s.active ? "Désactiver" : "Activer"}</button></form></div>
                  <CategoryForm parents={parents} initial={s} />
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
