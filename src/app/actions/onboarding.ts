"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth/guards";
import { normalizePhone } from "@/lib/phone";
import { uniqueProductSlug, uniqueShopSlug } from "@/server/modules/shops/service";
import { ensureFreeSubscription } from "@/server/modules/subscriptions/service";
import { filesFrom, storeImage, UploadError } from "@/server/storage";
import { audit } from "@/server/audit";
import type { FormState } from "./auth";

async function myDraftShop(userId: string) {
  const m = await db.shopMember.findFirst({ where: { userId, role: "OWNER" }, include: { shop: true } });
  return m?.shop ?? null;
}

const step3 = z.object({
  name: z.string().trim().min(2, "Nom de boutique trop court").max(60),
  country: z.string().length(2),
  cityId: z.string().min(1, "Choisissez une ville"),
  sector: z.string().trim().min(2, "Indiquez votre secteur").max(60),
  whatsapp: z.string().trim().min(6, "Numéro WhatsApp requis").max(25),
});

export async function onboardingInfoAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("/ouvrir-boutique");
  if (!user.verifiedAt) redirect("/verification?next=/ouvrir-boutique");
  const d = step3.safeParse(Object.fromEntries(form));
  if (!d.success) return { error: d.error.issues[0].message };
  const country = await db.country.findFirst({ where: { code: d.data.country, active: true } });
  const city = await db.city.findFirst({ where: { id: d.data.cityId, countryCode: d.data.country } });
  if (!country || !city) return { error: "Pays ou ville indisponible." };
  const whatsapp = normalizePhone(d.data.whatsapp, d.data.country);
  if (!whatsapp) return { error: "Numéro WhatsApp invalide." };

  const existing = await myDraftShop(user.id);
  if (existing) {
    await db.shop.update({ where: { id: existing.id }, data: { name: d.data.name, countryCode: country.code, cityId: city.id, sector: d.data.sector, whatsapp, phone: whatsapp, onboardingStep: Math.max(existing.onboardingStep, 4) } });
  } else {
    await db.$transaction(async (t) => {
      const shop = await t.shop.create({
        data: {
          slug: await uniqueShopSlug(d.data.name), name: d.data.name, countryCode: country.code, cityId: city.id, sector: d.data.sector,
          whatsapp, phone: whatsapp, status: "DRAFT", onboardingStep: 4, members: { create: { userId: user.id, role: "OWNER" } },
          deliveryOptions: { create: [{ name: `Livraison ${city.name}`, fee: 0, feeOnQuote: true, delayLabel: "24–48 h" }, { name: "Retrait sur place", fee: 0 }] },
        },
      });
      if (user.role === "BUYER") await t.user.update({ where: { id: user.id }, data: { role: "SELLER" } });
      return shop;
    });
  }
  revalidatePath("/ouvrir-boutique");
  redirect("/ouvrir-boutique");
}

export async function onboardingVisualsAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("/ouvrir-boutique");
  const shop = await myDraftShop(user.id);
  if (!shop) redirect("/ouvrir-boutique");
  try {
    const [logo] = filesFrom(form, "logo");
    const [cover] = filesFrom(form, "cover");
    const data: { logoUrl?: string; coverUrl?: string; onboardingStep: number } = { onboardingStep: Math.max(shop.onboardingStep, 5) };
    if (logo) data.logoUrl = await storeImage(logo, "logo", shop.id);
    if (cover) data.coverUrl = await storeImage(cover, "cover", shop.id);
    await db.shop.update({ where: { id: shop.id }, data });
  } catch (e) {
    if (e instanceof UploadError) return { error: e.message };
    throw e;
  }
  revalidatePath("/ouvrir-boutique");
  redirect("/ouvrir-boutique");
}

const productSchema = z.object({ title: z.string().trim().min(2, "Titre requis").max(140), price: z.coerce.number().int().positive("Prix invalide"), description: z.string().trim().max(5000).optional().default(""), categoryId: z.string().optional() });

export async function onboardingProductAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("/ouvrir-boutique");
  const shop = await db.shopMember.findFirst({ where: { userId: user.id, role: "OWNER" }, include: { shop: { include: { country: true } } } }).then((m) => m?.shop);
  if (!shop) redirect("/ouvrir-boutique");
  const d = productSchema.safeParse(Object.fromEntries(form));
  if (!d.success) return { error: d.error.issues[0].message };
  try {
    const images = filesFrom(form, "images").slice(0, 5);
    const urls = [];
    for (const f of images) urls.push(await storeImage(f, "product", shop.id));
    await db.product.create({
      data: {
        shopId: shop.id, slug: await uniqueProductSlug(d.data.title), title: d.data.title, price: d.data.price, currency: shop.country.currency,
        description: d.data.description, categoryId: d.data.categoryId || null, images: { create: urls.map((url, position) => ({ url, position, alt: d.data.title })) },
      },
    });
    await db.shop.update({ where: { id: shop.id }, data: { onboardingStep: 6 } });
  } catch (e) {
    if (e instanceof UploadError) return { error: e.message };
    throw e;
  }
  revalidatePath("/ouvrir-boutique");
  redirect("/ouvrir-boutique");
}

export async function onboardingSkipProductAction() {
  const user = await requireUser("/ouvrir-boutique");
  const m = await db.shopMember.findFirst({ where: { userId: user.id, role: "OWNER" } });
  if (m) await db.shop.update({ where: { id: m.shopId }, data: { onboardingStep: 6 } });
  revalidatePath("/ouvrir-boutique");
  redirect("/ouvrir-boutique");
}

export async function onboardingOpenAction() {
  const user = await requireUser("/ouvrir-boutique");
  const shop = await db.shopMember.findFirst({ where: { userId: user.id, role: "OWNER" }, include: { shop: { include: { country: true } } } }).then((m) => m?.shop);
  if (!shop) redirect("/ouvrir-boutique");
  await db.shop.update({ where: { id: shop.id }, data: { status: "ACTIVE", onboardingStep: 7 } });
  await ensureFreeSubscription(shop.id, shop.country.currency);
  await audit(user.id, "shop.open", { type: "shop", id: shop.id, countryCode: shop.countryCode });
  redirect("/vendeur?bienvenue=1");
}
