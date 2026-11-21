import type { MetadataRoute } from "next";
import { db } from "@/server/db";
import { absoluteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [shops, products, categories] = await Promise.all([
    db.shop.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true }, take: 10000 }),
    db.product.findMany({ where: { status: "ACTIVE", deletedAt: null, shop: { status: "ACTIVE" } }, select: { slug: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 40000 }),
    db.category.findMany({ where: { active: true }, select: { slug: true } }),
  ]);
  return [
    { url: absoluteUrl("/"), changeFrequency: "hourly", priority: 1 },
    { url: absoluteUrl("/produits"), changeFrequency: "hourly" },
    { url: absoluteUrl("/boutiques"), changeFrequency: "daily" },
    { url: absoluteUrl("/vendre") },
    ...categories.map((c) => ({ url: absoluteUrl(`/categorie/${c.slug}`), changeFrequency: "daily" as const })),
    ...shops.map((s) => ({ url: absoluteUrl(`/boutique/${s.slug}`), lastModified: s.updatedAt })),
    ...products.map((p) => ({ url: absoluteUrl(`/produit/${p.slug}`), lastModified: p.updatedAt })),
  ];
}
