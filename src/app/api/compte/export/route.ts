import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import { rateLimit } from "@/server/rate-limit";

/** Portabilité des données : export JSON des données personnelles de l'utilisateur. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Non authentifié", { status: 401 });
  if (!(await rateLimit(`export:${user.id}`, 5, 3600))) return new Response("Trop de demandes", { status: 429 });
  const data = await db.user.findUnique({
    where: { id: user.id },
    select: {
      id: true, name: true, email: true, phone: true, role: true, locale: true, countryCode: true, createdAt: true, verifiedAt: true,
      orders: { include: { subOrders: { include: { items: true, shop: { select: { name: true, slug: true } } } } } },
      reviews: true, favorites: { include: { product: { select: { title: true, slug: true } } } }, notifications: true,
      shops: { include: { shop: { include: { products: { where: { deletedAt: null } }, deliveryOptions: true, subscriptions: true } } } },
    },
  });
  return new Response(JSON.stringify({ exportedAt: new Date().toISOString(), data }, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="ecom-market-mes-donnees.json"`, "Cache-Control": "no-store" },
  });
}
