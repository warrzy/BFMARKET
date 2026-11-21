import Link from "next/link";
import { db } from "@/server/db";
import { getI18n } from "@/i18n";
import { SiteShell } from "@/components/layout/SiteShell";
import { CategoryIcon } from "@/components/ui/CategoryIcon";

export const metadata = { title: "Catégories" };

export default async function CategoriesPage() {
  const { locale, tx } = await getI18n();
  const cats = await db.category.findMany({
    where: { parentId: null, active: true }, orderBy: { sortOrder: "asc" },
    include: { children: { where: { active: true }, orderBy: { sortOrder: "asc" } }, _count: { select: { products: { where: { status: "ACTIVE", deletedAt: null } } } } },
  });
  const n = (c: { nameFr: string; nameEn: string }) => (locale === "en" ? c.nameEn : c.nameFr);
  return (
    <SiteShell>
      <div className="container-x py-8">
        <h1 className="mb-6 text-3xl font-extrabold">{tx("Toutes les catégories", "All categories")}</h1>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cats.map((c) => (
            <div key={c.id} className="card p-4">
              <Link href={`/categorie/${c.slug}`} className="group flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-500 group-hover:text-white dark:bg-brand-500/10"><CategoryIcon name={c.icon} className="h-6 w-6" /></span>
                <span><span className="block font-semibold">{n(c)}</span><span className="text-xs muted">{c._count.products} {tx("produits", "products")}</span></span>
              </Link>
              {c.children.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">{c.children.map((s) => <Link key={s.id} href={`/categorie/${s.slug}`} className="rounded-full bg-[rgb(var(--surface-2))] px-2.5 py-1 text-xs hover:text-brand-600">{n(s)}</Link>)}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </SiteShell>
  );
}
