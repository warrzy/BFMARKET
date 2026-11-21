import type { Prisma, TransactionStatus } from "@prisma/client";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { absoluteUrl } from "@/lib/utils";
import { getProvider } from "./registry";
import type { VerifiedStatus } from "./types";
import { activateSubscriptionFromTransaction } from "../subscriptions/service";

/** Initialise un paiement en ligne pour une sous-commande (idempotent par sous-commande + tentative). */
export async function initiateSubOrderPayment(subOrderId: string, attempt = 1) {
  const sub = await db.subOrder.findUniqueOrThrow({
    where: { id: subOrderId },
    include: { order: true, shop: true },
  });
  const provider = getProvider(sub.paymentMethod);
  if (!provider || provider.kind !== "online") return null;
  const cfg = await db.paymentProviderConfig.findUnique({
    where: { provider_countryCode: { provider: provider.code, countryCode: sub.shop.countryCode } },
  });
  if (!cfg?.enabled || !provider.isConfigured()) throw new Error("Prestataire indisponible pour ce pays.");

  const idempotencyKey = `order:${sub.id}:${attempt}`;
  const existing = await db.transaction.findUnique({ where: { idempotencyKey } });
  const tx = existing ?? (await db.transaction.create({
    data: { provider: provider.code, purpose: "order", subOrderId: sub.id, amount: sub.total, currency: sub.currency, idempotencyKey },
  }));
  const result = await provider.initiate({
    transactionId: tx.id,
    amount: sub.total,
    currency: sub.currency,
    description: `Commande ${sub.reference}`,
    customer: { name: sub.order.buyerName, phone: sub.order.buyerPhone, email: sub.order.buyerEmail },
    returnUrl: absoluteUrl(`/commande/suivi/${sub.order.trackingToken}`),
    notifyUrl: absoluteUrl(`/api/webhooks/payments/${provider.code}`),
    mode: cfg.mode === "live" ? "live" : "test",
  });
  await db.$transaction([
    db.transaction.update({
      where: { id: tx.id },
      data: { status: "PENDING", providerRef: result.kind === "redirect" ? result.providerRef ?? null : null },
    }),
    db.subOrder.update({ where: { id: sub.id }, data: { paymentStatus: "PENDING" } }),
  ]);
  return result;
}

const MAP: Record<VerifiedStatus["status"], TransactionStatus> = {
  SUCCEEDED: "SUCCEEDED", PENDING: "PENDING", FAILED: "FAILED", CANCELLED: "CANCELLED",
};

/**
 * Applique un statut VÉRIFIÉ auprès du prestataire. Contrôle montant et devise :
 * un écart bloque le passage à « payé » et est journalisé pour rapprochement.
 */
export async function applyVerifiedStatus(transactionId: string, v: VerifiedStatus) {
  const tx = await db.transaction.findUnique({ where: { id: transactionId } });
  if (!tx) return { ok: false, reason: "unknown_transaction" };
  if (tx.status === "SUCCEEDED" && v.status === "SUCCEEDED") return { ok: true, reason: "already_processed" };

  if (v.status === "SUCCEEDED") {
    const amountMismatch = v.amount != null && v.amount !== tx.amount;
    const currencyMismatch = v.currency != null && v.currency !== tx.currency;
    if (amountMismatch || currencyMismatch) {
      await db.transaction.update({
        where: { id: tx.id },
        data: { status: "FAILED", failureReason: `Écart montant/devise (reçu ${v.amount} ${v.currency})`, rawStatus: v.raw },
      });
      await audit(null, "payment.mismatch", { type: "transaction", id: tx.id }, { received: v.amount ?? null, expected: tx.amount });
      return { ok: false, reason: "amount_mismatch" };
    }
  }

  const status = MAP[v.status];
  await db.$transaction(async (t) => {
    await t.transaction.update({
      where: { id: tx.id },
      data: { status, rawStatus: v.raw, providerRef: tx.providerRef ?? v.providerRef ?? null },
    });
    if (tx.subOrderId) {
      const paymentStatus = status === "SUCCEEDED" ? "PAID" : status === "PENDING" ? "PENDING" : "FAILED";
      const sub = await t.subOrder.update({ where: { id: tx.subOrderId }, data: { paymentStatus } });
      await t.orderEvent.create({
        data: { subOrderId: sub.id, type: "payment", toValue: paymentStatus, note: `Vérifié auprès de ${tx.provider}` },
      });
    }
  });
  if (tx.subscriptionId && status === "SUCCEEDED") await activateSubscriptionFromTransaction(tx.id);
  return { ok: true, reason: status };
}

/** Traitement d'un webhook : journalisé, idempotent, et toujours revérifié côté serveur. */
export async function handleWebhook(providerCode: string, headers: Headers, rawBody: string) {
  const provider = getProvider(providerCode);
  if (!provider?.parseWebhook || !provider.verify) return { status: 404 as const };
  const parsed = await provider.parseWebhook({ headers, rawBody });
  if (!parsed) return { status: 400 as const };

  let payload: Prisma.InputJsonValue;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    payload = Object.fromEntries(new URLSearchParams(rawBody));
  }
  const event = await db.webhookEvent.upsert({
    where: { provider_eventKey: { provider: providerCode, eventKey: parsed.eventKey } },
    create: { provider: providerCode, eventKey: parsed.eventKey, payload },
    update: {},
  });
  if (event.processedAt) return { status: 200 as const, duplicate: true };

  const tx = await db.transaction.findUnique({ where: { id: parsed.transactionId }, include: { subOrder: { include: { shop: true } } } });
  if (!tx) {
    await db.webhookEvent.update({ where: { id: event.id }, data: { error: "Transaction inconnue" } });
    return { status: 200 as const };
  }
  const country = tx.subOrder?.shop.countryCode;
  const cfg = country
    ? await db.paymentProviderConfig.findUnique({ where: { provider_countryCode: { provider: providerCode, countryCode: country } } })
    : null;
  try {
    // PayDunya se vérifie par token de facture (providerRef), CinetPay par notre transaction_id.
    const lookupId = providerCode === "paydunya" ? tx.providerRef ?? tx.id : tx.id;
    const verified = await provider.verify(lookupId, cfg?.mode === "live" ? "live" : "test");
    const result = await applyVerifiedStatus(tx.id, verified);
    await db.webhookEvent.update({ where: { id: event.id }, data: { verified: true, processedAt: new Date(), error: result.ok ? null : result.reason } });
  } catch (e) {
    await db.webhookEvent.update({ where: { id: event.id }, data: { error: (e as Error).message.slice(0, 500) } });
    return { status: 500 as const };
  }
  return { status: 200 as const };
}
