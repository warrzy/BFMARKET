import type { PaymentStatus, SubOrderStatus } from "@prisma/client";
import { db } from "@/server/db";
import { randomCode } from "@/lib/slug";
import { randomToken } from "@/server/crypto";
import { CartError, couponDiscount, groupByShop, priceLines, type CartLineInput, type PricedProduct } from "./pricing";
import { canChangePayment, canTransition } from "./state";
import { notifyShopOwners } from "../notifications/service";
import { getProvider } from "../payments/registry";

export interface CheckoutInput {
  lines: CartLineInput[];
  buyer: { name: string; phone: string; email?: string | null };
  countryCode: string;
  city: string;
  neighborhood?: string | null;
  landmark?: string | null;
  note?: string | null;
  // par boutique : option de livraison, mode de paiement, coupon
  perShop: Record<string, { deliveryOptionId?: string | null; paymentMethod: string; couponCode?: string | null }>;
  userId?: string | null;
  channel?: "WEB" | "WHATSAPP";
}

async function loadProducts(ids: string[]) {
  const products = await db.product.findMany({
    where: { id: { in: ids }, deletedAt: null, shop: { status: "ACTIVE" } },
    include: { variants: true },
  });
  return new Map<string, PricedProduct>(products.map((p) => [p.id, p]));
}

/**
 * Crée une commande et UNE SOUS-COMMANDE PAR BOUTIQUE (frais, statut, paiement, responsabilité séparés).
 * Prix recalculés côté serveur, stock décrémenté de façon atomique, statut de paiement initial UNPAID.
 */
export async function createOrder(input: CheckoutInput) {
  if (input.lines.length === 0) throw new CartError("Panier vide.");
  if (input.lines.length > 50) throw new CartError("Trop d'articles dans le panier.");
  const products = await loadProducts([...new Set(input.lines.map((l) => l.productId))]);
  const priced = priceLines(input.lines, products);
  const groups = groupByShop(priced);

  const currencies = new Set(priced.map((l) => l.currency));
  const orderCurrency = currencies.size === 1 ? [...currencies][0] : "MULTI";

  const shopIds = [...groups.keys()];
  const shops = await db.shop.findMany({
    where: { id: { in: shopIds } },
    include: { deliveryOptions: { where: { active: true } } },
  });
  const now = new Date();
  const reference = `EM-${randomCode(6)}`;

  const order = await db.$transaction(async (t) => {
    // Décrément de stock conditionnel (évite la survente en concurrence)
    for (const l of priced) {
      if (l.variantId) {
        const v = products.get(l.productId)!.variants.find((x) => x.id === l.variantId)!;
        if (v.stock != null) {
          const r = await t.productVariant.updateMany({ where: { id: v.id, stock: { gte: l.quantity } }, data: { stock: { decrement: l.quantity } } });
          if (r.count === 0) throw new CartError(`Stock insuffisant pour « ${l.title} ».`);
        }
      }
      const p = products.get(l.productId)!;
      if (p.stock != null && !l.variantId) {
        const r = await t.product.updateMany({ where: { id: p.id, stock: { gte: l.quantity } }, data: { stock: { decrement: l.quantity } } });
        if (r.count === 0) throw new CartError(`Stock insuffisant pour « ${l.title} ».`);
      }
    }

    const created = await t.order.create({
      data: {
        reference, userId: input.userId ?? null, channel: input.channel ?? "WEB",
        buyerName: input.buyer.name, buyerPhone: input.buyer.phone, buyerEmail: input.buyer.email ?? null,
        countryCode: input.countryCode, city: input.city, neighborhood: input.neighborhood, landmark: input.landmark,
        note: input.note, currency: orderCurrency, itemsTotal: priced.reduce((s, l) => s + l.total, 0),
        trackingToken: randomToken(18),
      },
    });

    let i = 0;
    for (const [shopId, lines] of groups) {
      i++;
      const shop = shops.find((s) => s.id === shopId);
      if (!shop) throw new CartError("Boutique indisponible.");
      const choice = input.perShop[shopId] ?? { paymentMethod: "direct" };
      const enabled = await db.paymentProviderConfig.findFirst({
        where: { provider: choice.paymentMethod, countryCode: shop.countryCode, enabled: true },
      });
      const provider = getProvider(choice.paymentMethod);
      if (!enabled || !provider || !provider.isConfigured()) throw new CartError(`Mode de paiement indisponible pour ${shop.name}.`);

      const delivery = choice.deliveryOptionId ? shop.deliveryOptions.find((d) => d.id === choice.deliveryOptionId) : undefined;
      if (choice.deliveryOptionId && !delivery) throw new CartError(`Mode de livraison invalide pour ${shop.name}.`);
      const itemsTotal = lines.reduce((s, l) => s + l.total, 0);
      const currency = lines[0].currency;

      let discount = 0;
      let couponCode: string | null = null;
      if (choice.couponCode) {
        const c = await t.coupon.findFirst({
          where: {
            shopId, code: choice.couponCode.trim().toUpperCase(), scope: "order", active: true,
            OR: [{ startsAt: null }, { startsAt: { lte: now } }],
            AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
          },
        });
        if (c && (c.maxUses == null || c.usedCount < c.maxUses)) {
          discount = couponDiscount(c, itemsTotal, currency);
          couponCode = c.code;
          await t.coupon.update({ where: { id: c.id }, data: { usedCount: { increment: 1 } } });
        }
      }
      const deliveryFee = delivery && !delivery.feeOnQuote ? delivery.fee : 0;
      await t.subOrder.create({
        data: {
          orderId: created.id, shopId, reference: `${reference}-${i}`, paymentMethod: choice.paymentMethod,
          paymentStatus: "UNPAID", deliveryName: delivery?.name ?? null, deliveryFee,
          deliveryOnQuote: delivery?.feeOnQuote ?? false, itemsTotal, discount, couponCode,
          total: itemsTotal - discount + deliveryFee, currency,
          items: {
            create: lines.map((l) => ({
              productId: l.productId, variantId: l.variantId, title: l.title, variantName: l.variantName,
              unitPrice: l.unitPrice, quantity: l.quantity, total: l.total,
            })),
          },
          events: { create: { type: "status_change", toValue: "PENDING", note: input.channel === "WHATSAPP" ? "Commande initiée via WhatsApp" : "Commande passée sur ECOM MARKET" } },
        },
      });
    }
    return created;
  });

  for (const shopId of shopIds) {
    await notifyShopOwners(shopId, "order.new", "Nouvelle commande", `Commande ${reference} de ${input.buyer.name}`, "/vendeur/commandes");
  }
  return db.order.findUniqueOrThrow({
    where: { id: order.id },
    include: { subOrders: { include: { shop: true, items: true } } },
  });
}

/** Changement de statut par le vendeur — vérifie l'appartenance à la boutique (isolation). */
export async function updateSubOrderStatus(shopId: string, subOrderId: string, to: SubOrderStatus, actorId: string, note?: string) {
  const sub = await db.subOrder.findFirst({ where: { id: subOrderId, shopId }, include: { items: true } });
  if (!sub) throw new Error("Commande introuvable.");
  if (!canTransition(sub.status, to)) throw new Error("Transition de statut non autorisée.");
  await db.$transaction(async (t) => {
    await t.subOrder.update({ where: { id: sub.id }, data: { status: to } });
    await t.orderEvent.create({ data: { subOrderId: sub.id, type: "status_change", fromValue: sub.status, toValue: to, note, actorId } });
    // Annulation / retour : restitution du stock
    if (to === "CANCELLED" || to === "RETURNED") {
      for (const it of sub.items) {
        if (it.variantId) await t.productVariant.updateMany({ where: { id: it.variantId, stock: { not: null } }, data: { stock: { increment: it.quantity } } });
        else if (it.productId) await t.product.updateMany({ where: { id: it.productId, stock: { not: null } }, data: { stock: { increment: it.quantity } } });
      }
    }
  });
  const order = await db.order.findUnique({ where: { id: sub.orderId } });
  if (order?.userId) {
    await db.notification.create({
      data: { userId: order.userId, type: "order.status", title: `Commande ${sub.reference}`, body: `Nouveau statut : ${to}`, href: `/commande/suivi/${order.trackingToken}` },
    });
  }
}

/** Validation manuelle de l'encaissement par le vendeur. Crée une transaction tracée. */
export async function sellerSetPayment(shopId: string, subOrderId: string, to: PaymentStatus, actorId: string) {
  const sub = await db.subOrder.findFirst({ where: { id: subOrderId, shopId } });
  if (!sub) throw new Error("Commande introuvable.");
  if (!canChangePayment("seller", sub.paymentStatus, to)) throw new Error("Changement de paiement non autorisé.");
  await db.$transaction(async (t) => {
    await t.subOrder.update({ where: { id: sub.id }, data: { paymentStatus: to } });
    await t.orderEvent.create({ data: { subOrderId: sub.id, type: "payment", fromValue: sub.paymentStatus, toValue: to, actorId, note: "Validation manuelle par le vendeur" } });
    if (to === "PAID") {
      await t.transaction.create({
        data: {
          provider: sub.paymentMethod, purpose: "order", subOrderId: sub.id, amount: sub.total, currency: sub.currency,
          status: "SUCCEEDED", validatedById: actorId, idempotencyKey: `manual:${sub.id}:${Date.now()}`,
        },
      });
    }
  });
}

/** Le client peut seulement DÉCLARER avoir payé (jamais « payé »). */
export async function buyerDeclarePayment(trackingToken: string, subOrderId: string, note: string) {
  const sub = await db.subOrder.findFirst({ where: { id: subOrderId, order: { trackingToken } } });
  if (!sub) throw new Error("Commande introuvable.");
  if (!canChangePayment("buyer", sub.paymentStatus, "DECLARED")) throw new Error("Déclaration impossible pour cette commande.");
  await db.$transaction([
    db.subOrder.update({ where: { id: sub.id }, data: { paymentStatus: "DECLARED" } }),
    db.orderEvent.create({ data: { subOrderId: sub.id, type: "payment", fromValue: sub.paymentStatus, toValue: "DECLARED", note: note.slice(0, 300) } }),
  ]);
  await notifyShopOwners(sub.shopId, "order.payment_declared", "Paiement déclaré", `Le client déclare avoir payé ${sub.reference}. À vérifier.`, "/vendeur/commandes");
}

/** Statistiques financières distinguant commandes, encaissé (vérifié) et déclaré (non vérifié). */
export async function shopFinancials(shopId: string, since?: Date) {
  const where = { shopId, ...(since ? { createdAt: { gte: since } } : {}) };
  const [all, paid, declared, pending, cancelled] = await Promise.all([
    db.subOrder.aggregate({ where: { ...where, status: { notIn: ["CANCELLED"] } }, _sum: { total: true }, _count: true }),
    db.subOrder.aggregate({ where: { ...where, paymentStatus: "PAID" }, _sum: { total: true }, _count: true }),
    db.subOrder.aggregate({ where: { ...where, paymentStatus: "DECLARED" }, _sum: { total: true }, _count: true }),
    db.subOrder.count({ where: { ...where, status: "PENDING" } }),
    db.subOrder.count({ where: { ...where, status: "CANCELLED" } }),
  ]);
  return {
    ordersCount: all._count, ordersValue: all._sum.total ?? 0,
    paidCount: paid._count, paidValue: paid._sum.total ?? 0,
    declaredCount: declared._count, declaredValue: declared._sum.total ?? 0,
    pendingCount: pending, cancelledCount: cancelled,
  };
}
