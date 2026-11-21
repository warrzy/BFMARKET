"use server";

import { z } from "zod";
import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import { availableProviders } from "@/server/modules/payments/registry";
import { createOrder } from "@/server/modules/orders/service";
import { CartError } from "@/server/modules/orders/pricing";
import { normalizePhone } from "@/lib/phone";
import { rateLimit } from "@/server/rate-limit";
import { clientIp } from "@/server/request";
import { getLocale } from "@/i18n";

export async function getCheckoutOptions(shopIds: string[]) {
  const locale = await getLocale();
  const ids = [...new Set(shopIds)].slice(0, 20);
  const shops = await db.shop.findMany({
    where: { id: { in: ids }, status: "ACTIVE" },
    select: { id: true, name: true, countryCode: true, deliveryOptions: { where: { active: true }, select: { id: true, name: true, fee: true, feeOnQuote: true, delayLabel: true } } },
  });
  return Promise.all(shops.map(async (s) => ({
    id: s.id, name: s.name, countryCode: s.countryCode, delivery: s.deliveryOptions,
    payments: (await availableProviders(s.countryCode)).map(({ provider }) => ({ code: provider.code, label: provider.label[locale === "en" ? "en" : "fr"], online: provider.kind === "online" })),
  })));
}

const schema = z.object({
  lines: z.array(z.object({ productId: z.string().min(1).max(40), variantId: z.string().max(40).nullable().optional(), quantity: z.number().int().min(1).max(999) })).min(1).max(50),
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(6).max(25),
  email: z.string().trim().email().max(120).optional().or(z.literal("")),
  countryCode: z.string().length(2),
  city: z.string().trim().min(2).max(80),
  neighborhood: z.string().trim().max(80).optional(),
  landmark: z.string().trim().max(160).optional(),
  note: z.string().trim().max(500).optional(),
  perShop: z.record(z.object({ deliveryOptionId: z.string().max(40).nullable().optional(), paymentMethod: z.string().max(20), couponCode: z.string().max(30).nullable().optional() })),
  consent: z.literal(true),
});

export type PlaceOrderResult = { ok: true; trackingToken: string; reference: string } | { ok: false; error: string };

export async function placeOrder(input: unknown): Promise<PlaceOrderResult> {
  const ip = await clientIp();
  if (!(await rateLimit(`order:${ip}`, 10, 600))) return { ok: false, error: "Trop de commandes en peu de temps. Réessayez dans quelques minutes." };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Vérifiez les informations saisies (nom, téléphone, ville, acceptation des conditions)." };
  const d = parsed.data;
  const country = await db.country.findFirst({ where: { code: d.countryCode, active: true } });
  if (!country) return { ok: false, error: "Pays non disponible." };
  const phone = normalizePhone(d.phone, d.countryCode);
  if (!phone) return { ok: false, error: "Numéro de téléphone invalide pour ce pays." };
  const user = await getCurrentUser();
  try {
    const order = await createOrder({
      lines: d.lines, buyer: { name: d.name, phone, email: d.email || null }, countryCode: d.countryCode, city: d.city,
      neighborhood: d.neighborhood, landmark: d.landmark, note: d.note, perShop: d.perShop, userId: user?.id ?? null,
    });
    return { ok: true, trackingToken: order.trackingToken, reference: order.reference };
  } catch (e) {
    if (e instanceof CartError) return { ok: false, error: e.message };
    console.error("placeOrder", (e as Error).message);
    return { ok: false, error: "La commande n'a pas pu être enregistrée. Réessayez." };
  }
}
