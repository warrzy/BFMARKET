import { runSubscriptionLifecycle } from "@/server/modules/subscriptions/service";
import { safeEqual } from "@/server/crypto";

// À appeler périodiquement (ex. toutes les heures) avec l'en-tête Authorization: Bearer $CRON_SECRET
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) return new Response("Unauthorized", { status: 401 });
  const result = await runSubscriptionLifecycle();
  return Response.json(result);
}
