import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import { toCsv, toXlsx } from "@/server/modules/catalog/import";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Non authentifié", { status: 401 });
  const member = await db.shopMember.findFirst({ where: { userId: user.id, role: { in: ["OWNER", "MANAGER"] } }, include: { shop: true } });
  if (!member) return new Response("Accès refusé", { status: 403 });
  const products = await db.product.findMany({ where: { shopId: member.shopId, deletedAt: null }, include: { category: true, images: { take: 1, orderBy: { position: "asc" } } }, orderBy: { createdAt: "asc" } });
  const rows = products.map((p) => ({
    titre: p.title, description: p.description, prix: p.price, prix_promo: p.promoPrice, stock: p.stock, categorie: p.category?.slug ?? "",
    type: p.type, mots_cles: p.tags.join(", "), sku: p.sku ?? "", image_url: p.images[0]?.url.startsWith("http") ? p.images[0].url : "",
  }));
  const name = `catalogue-${member.shop.slug}-${new Date().toISOString().slice(0, 10)}`;
  if (new URL(req.url).searchParams.get("format") === "xlsx") {
    return new Response(new Uint8Array(await toXlsx(rows)), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${name}.xlsx"` } });
  }
  return new Response("﻿" + toCsv(rows), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}.csv"` } });
}
