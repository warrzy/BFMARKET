import { db } from "@/server/db";
import { RESERVED_SHOP_SLUGS, slugify } from "@/lib/slug";

export async function uniqueShopSlug(name: string): Promise<string> {
  const base = slugify(name) || "boutique";
  let candidate = RESERVED_SHOP_SLUGS.has(base) ? `${base}-shop` : base;
  for (let i = 2; await db.shop.findUnique({ where: { slug: candidate } }); i++) candidate = `${base}-${i}`;
  return candidate;
}

export async function uniqueProductSlug(title: string): Promise<string> {
  const base = slugify(title) || "produit";
  const suffix = () => Math.random().toString(36).slice(2, 7);
  let candidate = `${base}-${suffix()}`;
  while (await db.product.findUnique({ where: { slug: candidate } })) candidate = `${base}-${suffix()}`;
  return candidate;
}
