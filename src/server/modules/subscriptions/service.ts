import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { couponDiscount } from "../orders/pricing";
import { addInterval, effectiveFeatures, nextLifecycleState, parseFeatures, type SubState } from "./entitlements";
import { notifyShopOwners } from "../notifications/service";

export async function getShopSubscription(shopId: string) {
  return db.subscription.findFirst({ where: { shopId, current: true }, include: { plan: true }, orderBy: { createdAt: "desc" } });
}

export async function getShopEntitlements(shopId: string) {
  const [sub, free] = await Promise.all([getShopSubscription(shopId), db.plan.findUnique({ where: { code: "FREE" } })]);
  const freeFeatures = parseFeatures(free?.features);
  const plan = sub?.plan ?? free;
  return {
    subscription: sub,
    planCode: (sub && !["RESTRICTED", "CANCELLED"].includes(sub.status) ? sub.plan.code : "FREE") as string,
    features: effectiveFeatures(parseFeatures(plan?.features), (sub?.status as SubState) ?? "ACTIVE", freeFeatures),
  };
}

export async function assertCanAddProducts(shopId: string, count = 1) {
  const { features } = await getShopEntitlements(shopId);
  if (features.maxProducts == null) return;
  const current = await db.product.count({ where: { shopId, deletedAt: null } });
  if (current + count > features.maxProducts) {
    throw new Error(`Limite de votre offre atteinte (${features.maxProducts} produits). Passez à une offre supérieure.`);
  }
}

/** Abonnement gratuit attribué à l'ouverture de la boutique. */
export async function ensureFreeSubscription(shopId: string, currency: string) {
  const existing = await getShopSubscription(shopId);
  if (existing) return existing;
  const free = await db.plan.findUniqueOrThrow({ where: { code: "FREE" } });
  return db.subscription.create({ data: { shopId, planId: free.id, status: "ACTIVE", currency, amount: 0 } });
}

export async function quoteSubscription(shopId: string, planCode: string, interval: "monthly" | "yearly", couponCode?: string) {
  const shop = await db.shop.findUniqueOrThrow({ where: { id: shopId } });
  const plan = await db.plan.findUniqueOrThrow({ where: { code: planCode }, include: { prices: { where: { countryCode: shop.countryCode } } } });
  const price = plan.prices[0];
  if (!price) throw new Error("Cette offre n'a pas encore de tarif dans votre pays.");
  const base = interval === "yearly" ? price.yearly : price.monthly;
  let discount = 0;
  let coupon = null;
  if (couponCode) {
    const now = new Date();
    coupon = await db.coupon.findFirst({
      where: {
        code: couponCode.trim().toUpperCase(), shopId: null, scope: "subscription", active: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
    });
    if (!coupon || (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses)) throw new Error("Coupon invalide ou expiré.");
    discount = couponDiscount(coupon, base, price.currency);
  }
  return { plan, price, base, discount, total: base - discount, currency: price.currency, coupon };
}

/**
 * Souscription : essai gratuit si l'offre en prévoit un et que la boutique ne l'a jamais utilisé ;
 * sinon création d'une transaction « manual » en attente de validation par l'administration
 * (ou d'un paiement en ligne quand un prestataire est activé).
 */
export async function requestSubscription(shopId: string, actorId: string, planCode: string, interval: "monthly" | "yearly", couponCode?: string) {
  const q = await quoteSubscription(shopId, planCode, interval, couponCode);
  const hadTrial = await db.subscription.count({ where: { shopId, planId: q.plan.id, status: "TRIALING" } });
  const hadAnyTrial = hadTrial > 0 || (await db.auditLog.count({ where: { targetId: shopId, action: "subscription.trial" } })) > 0;

  if (q.plan.trialDays > 0 && !hadAnyTrial) {
    const sub = await db.$transaction(async (t) => {
      await t.subscription.updateMany({ where: { shopId, current: true }, data: { current: false } });
      return t.subscription.create({
        data: {
          shopId, planId: q.plan.id, status: "TRIALING", interval, currency: q.currency, amount: 0,
          currentPeriodEnd: new Date(Date.now() + q.plan.trialDays * 86400_000),
        },
      });
    });
    await audit(actorId, "subscription.trial", { type: "shop", id: shopId }, { plan: planCode });
    return { kind: "trial" as const, subscription: sub };
  }

  if (q.total === 0) {
    const sub = await activateNow(shopId, q.plan.id, interval, q.currency, 0, q.coupon?.code);
    await audit(actorId, "subscription.activate_free", { type: "shop", id: shopId }, { plan: planCode });
    return { kind: "active" as const, subscription: sub };
  }

  const pending = await db.subscription.create({
    data: {
      shopId, planId: q.plan.id, status: "ACTIVE", interval, currency: q.currency, amount: q.total,
      couponCode: q.coupon?.code, current: false, currentPeriodEnd: null,
    },
  });
  const tx = await db.transaction.create({
    data: {
      provider: "manual", purpose: "subscription", subscriptionId: pending.id, amount: q.total,
      currency: q.currency, status: "PENDING", idempotencyKey: `sub:${pending.id}`,
    },
  });
  await audit(actorId, "subscription.request", { type: "shop", id: shopId }, { plan: planCode, interval, amount: q.total });
  return { kind: "pending" as const, subscription: pending, transaction: tx };
}

async function activateNow(shopId: string, planId: string, interval: "monthly" | "yearly", currency: string, amount: number, couponCode?: string | null) {
  return db.$transaction(async (t) => {
    await t.subscription.updateMany({ where: { shopId, current: true }, data: { current: false } });
    if (couponCode) await t.coupon.updateMany({ where: { code: couponCode, shopId: null }, data: { usedCount: { increment: 1 } } });
    const now = new Date();
    return t.subscription.create({
      data: { shopId, planId, status: "ACTIVE", interval, currency, amount, couponCode, currentPeriodStart: now, currentPeriodEnd: addInterval(now, interval) },
    });
  });
}

/** Appelé après paiement vérifié (prestataire) ou validation manuelle par un admin. */
export async function activateSubscriptionFromTransaction(transactionId: string) {
  const tx = await db.transaction.findUniqueOrThrow({ where: { id: transactionId }, include: { subscription: true } });
  const sub = tx.subscription;
  if (!sub || sub.current) return sub;
  const now = new Date();
  // Renouvellement : la nouvelle période démarre à la fin de la période en cours si elle n'est pas échue.
  const prev = await getShopSubscription(sub.shopId);
  const start = prev?.planId === sub.planId && prev.currentPeriodEnd && prev.currentPeriodEnd > now ? prev.currentPeriodEnd : now;
  const updated = await db.$transaction(async (t) => {
    await t.subscription.updateMany({ where: { shopId: sub.shopId, current: true }, data: { current: false } });
    if (sub.couponCode) await t.coupon.updateMany({ where: { code: sub.couponCode, shopId: null }, data: { usedCount: { increment: 1 } } });
    return t.subscription.update({
      where: { id: sub.id },
      data: { current: true, status: "ACTIVE", currentPeriodStart: start, currentPeriodEnd: addInterval(start, sub.interval as "monthly" | "yearly") },
    });
  });
  await notifyShopOwners(sub.shopId, "subscription.active", "Abonnement activé", "Votre abonnement est actif. Merci !", "/vendeur/abonnement");
  return updated;
}

/** Tâche planifiée : rappels d'expiration, période de grâce, limitation progressive. */
export async function runSubscriptionLifecycle(now = new Date()) {
  const subs = await db.subscription.findMany({
    where: { current: true, currentPeriodEnd: { not: null }, status: { in: ["TRIALING", "ACTIVE", "PAST_DUE"] } },
  });
  let reminded = 0, changed = 0;
  for (const s of subs) {
    const end = s.currentPeriodEnd!;
    const daysLeft = (end.getTime() - now.getTime()) / 86400_000;
    if (daysLeft > 0 && daysLeft <= 3 && (!s.remindedAt || now.getTime() - s.remindedAt.getTime() > 2 * 86400_000)) {
      await db.subscription.update({ where: { id: s.id }, data: { remindedAt: now } });
      await notifyShopOwners(s.shopId, "subscription.expiring", "Votre abonnement expire bientôt",
        `Il expire le ${end.toLocaleDateString("fr-FR")}. Renouvelez pour garder vos avantages.`, "/vendeur/abonnement");
      reminded++;
    }
    const next = nextLifecycleState({ status: s.status as SubState, currentPeriodEnd: end }, now);
    if (next !== s.status) {
      await db.subscription.update({ where: { id: s.id }, data: { status: next } });
      await audit(null, "subscription.lifecycle", { type: "subscription", id: s.id }, { from: s.status, to: next });
      await notifyShopOwners(s.shopId, "subscription.status",
        next === "PAST_DUE" ? "Abonnement expiré — période de grâce" : "Boutique repassée à l'offre gratuite",
        next === "PAST_DUE" ? "Vos avantages restent actifs quelques jours. Renouvelez dès que possible." : "Les fonctionnalités avancées sont suspendues jusqu'au renouvellement.",
        "/vendeur/abonnement");
      changed++;
    }
  }
  return { checked: subs.length, reminded, changed };
}
