import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";

// Sélection minimale pour les cartes produit (pages légères).
export const productCardSelect = {
  id: true, slug: true, title: true, price: true, promoPrice: true, promoStartsAt: true, promoEndsAt: true,
  currency: true, stock: true, type: true, createdAt: true, featured: true,
  images: { select: { url: true, alt: true }, orderBy: { position: "asc" }, take: 1 },
  shop: { select: { slug: true, name: true, verification: true, logoUrl: true, city: { select: { name: true } }, country: { select: { flag: true, code: true } } } },
} satisfies Prisma.ProductSelect;

export type ProductCardData = Prisma.ProductGetPayload<{ select: typeof productCardSelect }>;

export interface Location { country?: string; cityId?: string }

/** Produits visibles publiquement : produit actif, non supprimé, boutique active. */
export function publicProductWhere(loc: Location = {}): Prisma.ProductWhereInput {
  return {
    status: "ACTIVE",
    deletedAt: null,
    shop: {
      status: "ACTIVE",
      ...(loc.country ? { countryCode: loc.country } : {}),
      ...(loc.cityId ? { cityId: loc.cityId } : {}),
      country: { active: true },
    },
  };
}

export function activePromoWhere(now = new Date()): Prisma.ProductWhereInput {
  return {
    promoPrice: { not: null, gt: 0 },
    AND: [
      { OR: [{ promoStartsAt: null }, { promoStartsAt: { lte: now } }] },
      { OR: [{ promoEndsAt: null }, { promoEndsAt: { gte: now } }] },
    ],
  };
}

export type SortKey = "recent" | "price_asc" | "price_desc" | "popular";

export interface SearchParams extends Location {
  q?: string;
  category?: string; // slug (inclut les sous-catégories)
  tab?: "all" | "verified" | "promo" | "new" | "near" | "flash";
  minPrice?: number;
  maxPrice?: number;
  type?: "PHYSICAL" | "DIGITAL" | "SERVICE";
  sort?: SortKey;
  cursor?: string;
  take?: number;
}

export async function searchProducts(p: SearchParams) {
  const take = Math.min(p.take ?? 24, 60);
  const now = new Date();
  const and: Prisma.ProductWhereInput[] = [publicProductWhere(p.tab === "near" ? p : { country: p.country, cityId: p.cityId })];

  if (p.q && p.q.trim().length >= 2) {
    const q = p.q.trim().slice(0, 80);
    and.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { tags: { has: q.toLowerCase() } },
        { description: { contains: q, mode: "insensitive" } },
        { shop: { name: { contains: q, mode: "insensitive" } } },
      ],
    });
  }
  if (p.category) {
    const cat = await db.category.findUnique({ where: { slug: p.category }, include: { children: { select: { id: true } } } });
    if (cat) and.push({ categoryId: { in: [cat.id, ...cat.children.map((c) => c.id)] } });
  }
  if (p.type) and.push({ type: p.type });
  if (p.minPrice != null) and.push({ price: { gte: p.minPrice } });
  if (p.maxPrice != null) and.push({ price: { lte: p.maxPrice } });
  if (p.tab === "verified") and.push({ shop: { verification: "VERIFIED" } });
  if (p.tab === "promo") and.push(activePromoWhere(now));
  if (p.tab === "flash") and.push(activePromoWhere(now), { promoEndsAt: { not: null, lte: new Date(now.getTime() + 7 * 86400_000) } });
  if (p.tab === "new") and.push({ createdAt: { gte: new Date(now.getTime() - 14 * 86400_000) } });

  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    p.sort === "price_asc" ? [{ price: "asc" }] :
    p.sort === "price_desc" ? [{ price: "desc" }] :
    p.sort === "popular" ? [{ viewCount: "desc" }] :
    p.tab === "flash" ? [{ promoEndsAt: "asc" }] : [{ featured: "desc" }, { createdAt: "desc" }];

  const items = await db.product.findMany({
    where: { AND: and },
    select: productCardSelect,
    orderBy: [...orderBy, { id: "asc" }],
    take: take + 1,
    ...(p.cursor ? { cursor: { id: p.cursor }, skip: 1 } : {}),
  });
  const hasMore = items.length > take;
  return { items: items.slice(0, take), nextCursor: hasMore ? items[take - 1].id : null };
}

export async function listProducts(where: Prisma.ProductWhereInput, orderBy: Prisma.ProductOrderByWithRelationInput[], take = 12, loc: Location = {}) {
  return db.product.findMany({ where: { AND: [publicProductWhere(loc), where] }, select: productCardSelect, orderBy, take });
}

export const shopCardSelect = {
  id: true, slug: true, name: true, tagline: true, logoUrl: true, coverUrl: true, verification: true, sector: true, accentColor: true,
  city: { select: { name: true } }, country: { select: { flag: true, nameFr: true, nameEn: true } },
  _count: { select: { products: { where: { status: "ACTIVE", deletedAt: null } } } },
} satisfies Prisma.ShopSelect;

export type ShopCardData = Prisma.ShopGetPayload<{ select: typeof shopCardSelect }>;

export async function listShops(where: Prisma.ShopWhereInput, take = 8, orderBy: Prisma.ShopOrderByWithRelationInput[] = [{ visitCount: "desc" }]) {
  return db.shop.findMany({ where: { status: "ACTIVE", country: { active: true }, ...where }, select: shopCardSelect, orderBy, take });
}
