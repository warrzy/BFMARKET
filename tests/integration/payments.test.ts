import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ headers: async () => new Headers(), cookies: async () => ({ get: () => undefined }) }));

import { db } from "@/server/db";
import { PROVIDERS } from "@/server/modules/payments/registry";
import { applyVerifiedStatus, handleWebhook } from "@/server/modules/payments/service";
import { createOrder } from "@/server/modules/orders/service";
import type { PaymentProviderInterface } from "@/server/modules/payments/types";

// Nécessite une base migrée + seed de démonstration (CI : service PostgreSQL).
let verifyCalls = 0;
let nextStatus: "SUCCEEDED" | "FAILED" = "SUCCEEDED";
let nextAmount: number | undefined;
const fake: PaymentProviderInterface = {
  code: "fakepay", label: { fr: "Fake", en: "Fake" }, kind: "online", supportsRefund: false, isConfigured: () => true,
  async initiate() { return { kind: "redirect", url: "https://example.test/pay" }; },
  async verify() { verifyCalls++; return { status: nextStatus, amount: nextAmount, currency: "XOF" }; },
  async parseWebhook({ rawBody }) { const p = new URLSearchParams(rawBody); return { transactionId: p.get("tx")!, eventKey: p.get("evt")! }; },
};

let shopId = "";
let productId = "";

beforeAll(async () => {
  PROVIDERS.fakepay = fake;
  const product = await db.product.findFirstOrThrow({ where: { status: "ACTIVE", deletedAt: null, stock: { gt: 2 }, variants: { none: {} }, shop: { countryCode: "BF", status: "ACTIVE" } } });
  productId = product.id;
  shopId = product.shopId;
  await db.paymentProviderConfig.upsert({ where: { provider_countryCode: { provider: "fakepay", countryCode: "BF" } }, create: { provider: "fakepay", countryCode: "BF", enabled: true }, update: { enabled: true } });
});

afterAll(async () => {
  await db.paymentProviderConfig.deleteMany({ where: { provider: "fakepay" } });
  await db.$disconnect();
});

async function newOrder(paymentMethod: string) {
  const order = await createOrder({
    lines: [{ productId, quantity: 1 }], buyer: { name: "Test Intégration", phone: "+22670000001" }, countryCode: "BF", city: "Ouagadougou",
    perShop: { [shopId]: { paymentMethod } },
  });
  return order.subOrders[0];
}

describe("paiements", () => {
  it("une commande hors ligne est créée NON payée et le stock est décrémenté", async () => {
    const before = (await db.product.findUniqueOrThrow({ where: { id: productId } })).stock!;
    const sub = await newOrder("cod");
    expect(sub.paymentStatus).toBe("UNPAID");
    expect((await db.product.findUniqueOrThrow({ where: { id: productId } })).stock).toBe(before - 1);
  });

  it("webhook : revérification serveur, idempotence, passage à PAID une seule fois", async () => {
    const sub = await newOrder("fakepay");
    const tx = await db.transaction.create({ data: { provider: "fakepay", purpose: "order", subOrderId: sub.id, amount: sub.total, currency: sub.currency, idempotencyKey: `t:${sub.id}`, status: "PENDING" } });
    nextStatus = "SUCCEEDED"; nextAmount = sub.total; verifyCalls = 0;
    const body = `tx=${tx.id}&evt=evt-${tx.id}`;
    expect((await handleWebhook("fakepay", new Headers(), body)).status).toBe(200);
    expect((await handleWebhook("fakepay", new Headers(), body)).status).toBe(200); // rejeu
    expect(verifyCalls).toBe(1);
    expect((await db.subOrder.findUniqueOrThrow({ where: { id: sub.id } })).paymentStatus).toBe("PAID");
    expect(await db.webhookEvent.count({ where: { provider: "fakepay", eventKey: `evt-${tx.id}` } })).toBe(1);
  });

  it("un écart de montant bloque le passage à PAID", async () => {
    const sub = await newOrder("fakepay");
    const tx = await db.transaction.create({ data: { provider: "fakepay", purpose: "order", subOrderId: sub.id, amount: sub.total, currency: sub.currency, idempotencyKey: `m:${sub.id}`, status: "PENDING" } });
    const r = await applyVerifiedStatus(tx.id, { status: "SUCCEEDED", amount: sub.total - 1, currency: "XOF" });
    expect(r.ok).toBe(false);
    expect((await db.subOrder.findUniqueOrThrow({ where: { id: sub.id } })).paymentStatus).not.toBe("PAID");
    expect((await db.transaction.findUniqueOrThrow({ where: { id: tx.id } })).status).toBe("FAILED");
  });

  it("refuse un mode de paiement non activé pour le pays", async () => {
    await expect(newOrder("cinetpay")).rejects.toThrow(/indisponible/);
  });
});
