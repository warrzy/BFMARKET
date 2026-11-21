import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { getI18n } from "@/i18n";
import { SiteShell } from "@/components/layout/SiteShell";
import { CatalogView } from "@/components/product/CatalogView";

type P = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const c = await db.category.findUnique({ where: { slug: (await params).slug } });
  return c ? { title: c.nameFr, description: `${c.nameFr} : produits et boutiques près de chez vous sur ECOM MARKET.` } : {};
}

export default async function CategoryPage({ params, searchParams }: P) {
  const { slug } = await params;
  const cat = await db.category.findFirst({ where: { slug, active: true }, include: { children: { where: { active: true }, orderBy: { sortOrder: "asc" } }, parent: true } });
  if (!cat) notFound();
  const { locale, tx } = await getI18n();
  const name = (c: { nameFr: string; nameEn: string }) => (locale === "en" ? c.nameEn : c.nameFr);
  return (
    <SiteShell>
      <div className="container-x pt-6 text-sm muted">
        <Link href="/categories" className="hover:underline">{tx("Catégories", "Categories")}</Link>
        {cat.parent && <> / <Link href={`/categorie/${cat.parent.slug}`} className="hover:underline">{name(cat.parent)}</Link></>}
      </div>
      {cat.children.length > 0 && (
        <div className="container-x scroll-row pt-4">
          {cat.children.map((c) => <Link key={c.id} href={`/categorie/${c.slug}`} className="chip">{name(c)}</Link>)}
        </div>
      )}
      <CatalogView sp={await searchParams} fixedCategory={cat.slug} title={name(cat)} />
    </SiteShell>
  );
}
