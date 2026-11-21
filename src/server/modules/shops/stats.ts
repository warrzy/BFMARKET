import { db } from "@/server/db";

export function lastDays(n: number) {
  const days: Date[] = [];
  const today = new Date(new Date().toISOString().slice(0, 10));
  for (let i = n - 1; i >= 0; i--) days.push(new Date(today.getTime() - i * 86400_000));
  return days;
}

export async function shopDailySeries(shopId: string, n = 30) {
  const days = lastDays(n);
  const since = days[0];
  const [visits, orders] = await Promise.all([
    db.shopVisitDaily.findMany({ where: { shopId, day: { gte: since } } }),
    db.$queryRaw<{ day: Date; count: bigint; revenue: bigint }[]>`
      SELECT date_trunc('day', s."createdAt") AS day, COUNT(*)::bigint AS count, COALESCE(SUM(s."total"),0)::bigint AS revenue
      FROM "SubOrder" s WHERE s."shopId" = ${shopId} AND s."createdAt" >= ${since} AND s."status" <> 'CANCELLED'
      GROUP BY 1`,
  ]);
  const key = (d: Date) => d.toISOString().slice(0, 10);
  const vMap = new Map(visits.map((v) => [key(v.day), v.count]));
  const oMap = new Map(orders.map((o) => [key(new Date(o.day)), { count: Number(o.count), total: Number(o.revenue) }]));
  return days.map((d) => ({
    key: key(d), label: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
    visits: vMap.get(key(d)) ?? 0, orders: oMap.get(key(d))?.count ?? 0, revenue: oMap.get(key(d))?.total ?? 0,
  }));
}

export async function topProducts(shopId: string, take = 5) {
  // SQL explicite : le groupBy Prisma avec filtre relationnel génère une colonne « total » ambiguë.
  const rows = await db.$queryRaw<{ id: string; title: string; slug: string; viewCount: number; sold: bigint; revenue: bigint }[]>`
    SELECT p.id, p.title, p.slug, p."viewCount", SUM(oi.quantity)::bigint AS sold, SUM(oi.total)::bigint AS revenue
    FROM "OrderItem" oi
    JOIN "SubOrder" so ON so.id = oi."subOrderId"
    JOIN "Product" p ON p.id = oi."productId"
    WHERE so."shopId" = ${shopId} AND so.status <> 'CANCELLED'
    GROUP BY p.id ORDER BY sold DESC LIMIT ${take}`;
  return rows.map((r) => ({ ...r, sold: Number(r.sold), revenue: Number(r.revenue) }));
}
