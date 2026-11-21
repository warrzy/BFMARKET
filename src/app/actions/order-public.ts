"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { buyerDeclarePayment } from "@/server/modules/orders/service";
import { initiateSubOrderPayment } from "@/server/modules/payments/service";
import { rateLimit } from "@/server/rate-limit";
import { clientIp } from "@/server/request";

// Le jeton de suivi (aléatoire, 144 bits) sert d'autorisation pour le client invité.

export async function declarePaymentAction(form: FormData) {
  const token = String(form.get("token") ?? "");
  const sub = String(form.get("subOrderId") ?? "");
  const note = String(form.get("note") ?? "").trim();
  if (!(await rateLimit(`declare:${await clientIp()}`, 10, 3600))) return;
  await buyerDeclarePayment(token, sub, note || "Paiement déclaré par le client");
  revalidatePath(`/commande/suivi/${token}`);
}

export async function payOnlineAction(form: FormData) {
  const token = String(form.get("token") ?? "");
  const subId = String(form.get("subOrderId") ?? "");
  const sub = await db.subOrder.findFirst({ where: { id: subId, order: { trackingToken: token } }, include: { transactions: true } });
  if (!sub || sub.paymentStatus === "PAID") redirect(`/commande/suivi/${token}`);
  const result = await initiateSubOrderPayment(sub.id, sub.transactions.length + 1);
  if (result?.kind === "redirect") redirect(result.url);
  redirect(`/commande/suivi/${token}`);
}

const reviewSchema = z.object({ token: z.string().min(10), subOrderId: z.string(), productId: z.string(), rating: z.coerce.number().int().min(1).max(5), comment: z.string().trim().max(1000) });

/** Avis vérifié : uniquement pour une sous-commande LIVRÉE, un avis par produit commandé. */
export async function submitReviewAction(form: FormData) {
  const d = reviewSchema.safeParse(Object.fromEntries(form));
  if (!d.success) return;
  const sub = await db.subOrder.findFirst({
    where: { id: d.data.subOrderId, status: "DELIVERED", order: { trackingToken: d.data.token } },
    include: { order: true, items: true },
  });
  if (!sub || !sub.items.some((i) => i.productId === d.data.productId)) return;
  await db.review.upsert({
    where: { subOrderId_productId: { subOrderId: sub.id, productId: d.data.productId } },
    create: {
      subOrderId: sub.id, productId: d.data.productId, shopId: sub.shopId, userId: sub.order.userId,
      authorName: sub.order.buyerName.split(" ")[0] + (sub.order.buyerName.includes(" ") ? ` ${sub.order.buyerName.split(" ").pop()![0]}.` : ""),
      rating: d.data.rating, comment: d.data.comment,
    },
    update: { rating: d.data.rating, comment: d.data.comment },
  });
  revalidatePath(`/commande/suivi/${d.data.token}`);
}
