"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { PaymentStatus, Prisma, SubOrderStatus } from "@prisma/client";
import { db } from "@/server/db";
import { requireShop } from "@/server/auth/guards";
import { audit } from "@/server/audit";
import { filesFrom, storeImage, storeVideo, UploadError } from "@/server/storage";
import { normalizePhone } from "@/lib/phone";
import { uniqueProductSlug } from "@/server/modules/shops/service";
import { assertCanAddProducts, getShopEntitlements, requestSubscription } from "@/server/modules/subscriptions/service";
import { sellerSetPayment, updateSubOrderStatus } from "@/server/modules/orders/service";
import { parseCatalogFile } from "@/server/modules/catalog/import";
import { improveText } from "@/server/modules/ai/assistant";
import { rateLimit } from "@/server/rate-limit";
import type { FormState } from "./auth";

// Toutes les actions passent par requireShop() puis filtrent par shop.id : un vendeur
// ne peut jamais lire ni modifier les données d'une autre boutique.

const optInt = z.union([z.literal(""), z.coerce.number().int().min(0)]).optional().transform((v) => (v === "" || v == null ? null : v));
const optDate = z.string().optional().transform((v) => (v ? new Date(v) : null)).refine((d) => d == null || !Number.isNaN(d.getTime()), "Date invalide");

function handleUpload(e: unknown): FormState {
  if (e instanceof UploadError) return { error: e.message };
  throw e;
}

// ───────────── Boutique ─────────────

const shopSchema = z.object({
  name: z.string().trim().min(2).max(60),
  tagline: z.string().trim().max(120).optional().default(""),
  description: z.string().trim().max(3000).optional().default(""),
  sector: z.string().trim().max(60).optional().default(""),
  cityId: z.string().optional(),
  neighborhood: z.string().trim().max(80).optional().default(""),
  address: z.string().trim().max(200).optional().default(""),
  whatsapp: z.string().trim().max(25).optional().default(""),
  phone: z.string().trim().max(25).optional().default(""),
  email: z.string().trim().email().max(120).optional().or(z.literal("")),
  deliveryPolicy: z.string().trim().max(1000).optional().default(""),
  returnPolicy: z.string().trim().max(1000).optional().default(""),
  hours_lun_ven: z.string().trim().max(40).optional().default(""),
  hours_sam: z.string().trim().max(40).optional().default(""),
  hours_dim: z.string().trim().max(40).optional().default(""),
  theme: z.enum(["savane", "nuit", "kente", "minimal"]).optional().default("savane"),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().default("#E8590C"),
  facebook: z.string().trim().max(200).optional().default(""),
  tiktok: z.string().trim().max(200).optional().default(""),
  instagram: z.string().trim().max(200).optional().default(""),
});

export async function updateShopAction(_: FormState, form: FormData): Promise<FormState> {
  const { shop } = await requireShop("MANAGER");
  const d = shopSchema.safeParse(Object.fromEntries(form));
  if (!d.success) return { error: `Champ invalide : ${d.error.issues[0].path.join(".")}` };
  const v = d.data;
  const whatsapp = v.whatsapp ? normalizePhone(v.whatsapp, shop.countryCode) : null;
  if (v.whatsapp && !whatsapp) return { error: "Numéro WhatsApp invalide." };
  const phone = v.phone ? normalizePhone(v.phone, shop.countryCode) : null;
  const city = v.cityId ? await db.city.findFirst({ where: { id: v.cityId, countryCode: shop.countryCode } }) : null;
  const ent = await getShopEntitlements(shop.id);
  const data: Prisma.ShopUpdateInput = {
    name: v.name, tagline: v.tagline || null, description: v.description, sector: v.sector || null,
    city: city ? { connect: { id: city.id } } : undefined, neighborhood: v.neighborhood || null, address: v.address || null,
    whatsapp, phone, email: v.email || null, deliveryPolicy: v.deliveryPolicy || null, returnPolicy: v.returnPolicy || null,
    openingHours: Object.fromEntries(Object.entries({ lun_ven: v.hours_lun_ven, sam: v.hours_sam, dim: v.hours_dim }).filter(([, x]) => x)),
    socials: { facebook: v.facebook, tiktok: v.tiktok, instagram: v.instagram },
    accentColor: v.accentColor,
    // Les thèmes premium sont réservés aux offres avec personnalisation
    theme: ent.features.customization || v.theme === "savane" ? v.theme : shop.theme,
  };
  try {
    const [logo] = filesFrom(form, "logo");
    const [cover] = filesFrom(form, "cover");
    if (logo) data.logoUrl = await storeImage(logo, "logo", shop.id);
    if (cover) data.coverUrl = await storeImage(cover, "cover", shop.id);
  } catch (e) {
    return handleUpload(e);
  }
  await db.shop.update({ where: { id: shop.id }, data });
  revalidatePath(`/boutique/${shop.slug}`);
  return { ok: "Boutique mise à jour." };
}

export async function requestVerificationAction() {
  const { shop, user } = await requireShop("OWNER");
  if (shop.verification === "VERIFIED" || shop.verification === "PENDING") return;
  await db.shop.update({ where: { id: shop.id }, data: { verification: "PENDING" } });
  await audit(user.id, "shop.verification_request", { type: "shop", id: shop.id, countryCode: shop.countryCode });
  revalidatePath("/vendeur/boutique");
}

export async function saveDeliveryOptionAction(form: FormData) {
  const { shop } = await requireShop("MANAGER");
  const d = z.object({ id: z.string().optional(), name: z.string().trim().min(2).max(80), fee: z.coerce.number().int().min(0).default(0), feeOnQuote: z.string().optional(), delayLabel: z.string().trim().max(40).optional() }).safeParse(Object.fromEntries(form));
  if (!d.success) return;
  const data = { name: d.data.name, fee: d.data.fee, feeOnQuote: d.data.feeOnQuote === "on", delayLabel: d.data.delayLabel || null };
  if (d.data.id) await db.deliveryOption.updateMany({ where: { id: d.data.id, shopId: shop.id }, data });
  else await db.deliveryOption.create({ data: { ...data, shopId: shop.id } });
  revalidatePath("/vendeur/boutique");
}

export async function deleteDeliveryOptionAction(form: FormData) {
  const { shop } = await requireShop("MANAGER");
  await db.deliveryOption.deleteMany({ where: { id: String(form.get("id")), shopId: shop.id } });
  revalidatePath("/vendeur/boutique");
}

export async function saveSectionAction(form: FormData) {
  const { shop } = await requireShop("MANAGER");
  const name = String(form.get("name") ?? "").trim().slice(0, 60);
  if (name.length < 2) return;
  const count = await db.shopSection.count({ where: { shopId: shop.id } });
  if (count >= 30) return;
  await db.shopSection.create({ data: { shopId: shop.id, name, position: count } });
  revalidatePath("/vendeur/boutique");
}

export async function deleteSectionAction(form: FormData) {
  const { shop } = await requireShop("MANAGER");
  await db.shopSection.deleteMany({ where: { id: String(form.get("id")), shopId: shop.id } });
  revalidatePath("/vendeur/boutique");
}

// ───────────── Produits ─────────────

const productSchema = z.object({
  title: z.string().trim().min(2, "Titre requis").max(140),
  description: z.string().trim().max(8000).optional().default(""),
  type: z.enum(["PHYSICAL", "DIGITAL", "SERVICE"]).default("PHYSICAL"),
  price: z.coerce.number().int("Prix entier").positive("Prix invalide"),
  promoPrice: optInt,
  promoStartsAt: optDate,
  promoEndsAt: optDate,
  stock: optInt,
  lowStockAlert: optInt,
  categoryId: z.string().optional(),
  shopSectionId: z.string().optional(),
  sku: z.string().trim().max(64).optional().default(""),
  tags: z.string().max(400).optional().default(""),
  status: z.enum(["ACTIVE", "DRAFT", "UNAVAILABLE"]).default("ACTIVE"),
  featured: z.string().optional(),
  seoTitle: z.string().trim().max(70).optional().default(""),
  seoDescription: z.string().trim().max(160).optional().default(""),
  digitalFileUrl: z.string().trim().url().startsWith("https://").optional().or(z.literal("")),
  variants: z.string().optional().default("[]"),
  removeImages: z.string().optional().default(""),
});

const variantSchema = z.array(z.object({ id: z.string().optional(), name: z.string().trim().min(1).max(60), price: z.number().int().positive().nullable().optional(), stock: z.number().int().min(0).nullable().optional() })).max(50);

export async function saveProductAction(_: FormState, form: FormData): Promise<FormState> {
  const { shop, user } = await requireShop("STAFF");
  const id = String(form.get("id") ?? "") || null;
  const d = productSchema.safeParse(Object.fromEntries(form));
  if (!d.success) return { error: d.error.issues[0].message };
  const v = d.data;
  if (v.promoPrice != null && v.promoPrice >= v.price) return { error: "Le prix promotionnel doit être inférieur au prix normal." };
  if (v.promoStartsAt && v.promoEndsAt && v.promoEndsAt <= v.promoStartsAt) return { error: "La fin de promotion doit suivre son début." };
  let variants: z.infer<typeof variantSchema>;
  try {
    variants = variantSchema.parse(JSON.parse(v.variants));
  } catch {
    return { error: "Variantes invalides." };
  }
  const ent = await getShopEntitlements(shop.id);
  if (v.promoPrice != null && !ent.features.promotions) return { error: "Les promotions sont disponibles avec l'offre Pro ou Business." };

  const existing = id ? await db.product.findFirst({ where: { id, shopId: shop.id, deletedAt: null }, include: { images: true } }) : null;
  if (id && !existing) return { error: "Produit introuvable." };
  if (!existing) {
    try { await assertCanAddProducts(shop.id); } catch (e) { return { error: (e as Error).message }; }
  }
  const category = v.categoryId ? await db.category.findUnique({ where: { id: v.categoryId } }) : null;
  const section = v.shopSectionId ? await db.shopSection.findFirst({ where: { id: v.shopSectionId, shopId: shop.id } }) : null;
  const moderation = (await db.setting.findUnique({ where: { key: "catalog.moderation" } }))?.value;

  let newImages: string[] = [];
  let videoUrl: string | undefined;
  try {
    const files = filesFrom(form, "images");
    const keep = (existing?.images.length ?? 0) - v.removeImages.split(",").filter(Boolean).length;
    for (const f of files.slice(0, Math.max(0, 8 - keep))) newImages.push(await storeImage(f, "product", shop.id));
    const [video] = filesFrom(form, "video");
    if (video) videoUrl = await storeVideo(video, shop.id);
  } catch (e) {
    return handleUpload(e);
  }

  const data = {
    title: v.title, description: v.description, type: v.type, price: v.price, promoPrice: v.promoPrice,
    promoStartsAt: v.promoStartsAt, promoEndsAt: v.promoEndsAt, stock: v.stock, lowStockAlert: v.lowStockAlert,
    categoryId: category?.id ?? null, shopSectionId: section?.id ?? null, sku: v.sku || null,
    tags: v.tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 20),
    status: moderation === "pre" && !existing && v.status === "ACTIVE" ? ("PENDING_REVIEW" as const) : v.status,
    featured: v.featured === "on", seoTitle: v.seoTitle || null, seoDescription: v.seoDescription || null,
    digitalFileUrl: v.type === "DIGITAL" ? v.digitalFileUrl || null : null,
    ...(videoUrl ? { videoUrl } : {}),
  };

  const productId = await db.$transaction(async (t) => {
    let pid: string;
    if (existing) {
      await t.product.update({ where: { id: existing.id }, data });
      pid = existing.id;
      const remove = v.removeImages.split(",").filter(Boolean);
      if (remove.length) await t.productImage.deleteMany({ where: { productId: pid, id: { in: remove } } });
    } else {
      const created = await t.product.create({ data: { ...data, shopId: shop.id, currency: shop.country.currency, slug: await uniqueProductSlug(v.title) } });
      pid = created.id;
    }
    const start = await t.productImage.count({ where: { productId: pid } });
    if (newImages.length) await t.productImage.createMany({ data: newImages.map((url, i) => ({ productId: pid, url, position: start + i, alt: v.title })) });
    // Variantes : synchronisation (mise à jour / création / suppression)
    const keepIds = variants.filter((x) => x.id).map((x) => x.id!);
    await t.productVariant.deleteMany({ where: { productId: pid, id: { notIn: keepIds } } });
    for (const x of variants) {
      const vd = { name: x.name, price: x.price ?? null, stock: x.stock ?? null, options: {} };
      if (x.id) await t.productVariant.updateMany({ where: { id: x.id, productId: pid }, data: vd });
      else await t.productVariant.create({ data: { ...vd, productId: pid } });
    }
    return pid;
  });
  newImages = [];
  await audit(user.id, existing ? "product.update" : "product.create", { type: "product", id: productId, countryCode: shop.countryCode });
  revalidatePath("/vendeur/produits");
  redirect(`/vendeur/produits?ok=${existing ? "maj" : "cree"}`);
}

export async function duplicateProductAction(form: FormData) {
  const { shop } = await requireShop("STAFF");
  const p = await db.product.findFirst({ where: { id: String(form.get("id")), shopId: shop.id, deletedAt: null }, include: { images: true, variants: true } });
  if (!p) return;
  await assertCanAddProducts(shop.id);
  await db.product.create({
    data: {
      shopId: shop.id, slug: await uniqueProductSlug(p.title), title: `${p.title} (copie)`, description: p.description, type: p.type,
      status: "DRAFT", currency: p.currency, price: p.price, promoPrice: p.promoPrice, stock: p.stock, tags: p.tags, categoryId: p.categoryId,
      attributes: p.attributes as Prisma.InputJsonValue,
      images: { create: p.images.map(({ url, alt, position }) => ({ url, alt, position })) },
      variants: { create: p.variants.map(({ name, price, stock, sku, options }) => ({ name, price, stock, sku, options: options as Prisma.InputJsonValue })) },
    },
  });
  revalidatePath("/vendeur/produits");
}

export async function deleteProductAction(form: FormData) {
  const { shop, user } = await requireShop("MANAGER");
  const id = String(form.get("id"));
  // Suppression logique : préserve l'historique des commandes
  const r = await db.product.updateMany({ where: { id, shopId: shop.id }, data: { deletedAt: new Date(), status: "UNAVAILABLE" } });
  if (r.count) await audit(user.id, "product.delete", { type: "product", id });
  revalidatePath("/vendeur/produits");
}

export async function toggleAvailabilityAction(form: FormData) {
  const { shop } = await requireShop("STAFF");
  const p = await db.product.findFirst({ where: { id: String(form.get("id")), shopId: shop.id, deletedAt: null } });
  if (!p || !["ACTIVE", "UNAVAILABLE", "DRAFT"].includes(p.status)) return;
  await db.product.update({ where: { id: p.id }, data: { status: p.status === "ACTIVE" ? "UNAVAILABLE" : "ACTIVE" } });
  revalidatePath("/vendeur/produits");
}

export async function updateStockAction(form: FormData) {
  const { shop } = await requireShop("STAFF");
  const id = String(form.get("id"));
  const raw = String(form.get("stock") ?? "");
  const stock = raw === "" ? null : Math.max(0, Math.floor(Number(raw)));
  if (raw !== "" && !Number.isFinite(stock)) return;
  if (form.get("variant") === "1") await db.productVariant.updateMany({ where: { id, product: { shopId: shop.id } }, data: { stock } });
  else await db.product.updateMany({ where: { id, shopId: shop.id }, data: { stock } });
  revalidatePath("/vendeur/stocks");
}

export async function aiImproveAction(input: { title: string; description: string; kind: "description" | "ad"; categoryName?: string }) {
  const { shop } = await requireShop("STAFF");
  const ent = await getShopEntitlements(shop.id);
  if (!(await rateLimit(`ai:${shop.id}`, ent.features.ai ? 60 : 5, 86400))) {
    return { text: "", error: ent.features.ai ? "Limite quotidienne atteinte." : "Assistant IA : 5 essais/jour avec l'offre gratuite. Passez à Pro pour plus." };
  }
  const r = await improveText({ title: input.title.slice(0, 140), description: input.description.slice(0, 3000), kind: input.kind, category: input.categoryName, city: shop.city?.name, locale: "fr" });
  return { text: r.text, source: r.source };
}

export async function importCatalogAction(_: FormState, form: FormData): Promise<FormState> {
  const { shop, user } = await requireShop("MANAGER");
  const ent = await getShopEntitlements(shop.id);
  if (!ent.features.import) return { error: "L'import de catalogue est inclus dans l'offre Business." };
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choisissez un fichier .csv ou .xlsx." };
  const report = await parseCatalogFile(file);
  if (report.rows.length === 0) return { error: `Aucune ligne valide. ${report.errors.slice(0, 5).map((e) => `L${e.line} : ${e.message}`).join(" · ")}` };
  try { await assertCanAddProducts(shop.id, report.rows.length); } catch (e) { return { error: (e as Error).message }; }
  const cats = await db.category.findMany();
  const findCat = (name: string) => cats.find((c) => c.slug === name.toLowerCase() || c.nameFr.toLowerCase() === name.toLowerCase() || c.nameEn.toLowerCase() === name.toLowerCase());
  let created = 0;
  for (const r of report.rows) {
    await db.product.create({
      data: {
        shopId: shop.id, slug: await uniqueProductSlug(r.titre), title: r.titre, description: r.description, price: r.prix,
        promoPrice: r.prix_promo, stock: r.stock, type: r.type, sku: r.sku || null, currency: shop.country.currency,
        categoryId: r.categorie ? findCat(r.categorie)?.id ?? null : null,
        tags: r.mots_cles.split(/[,;]/).map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 20),
        // Les images distantes ne sont pas téléchargées automatiquement (sécurité) : produit en brouillon si pas d'image
        status: "DRAFT",
        images: r.image_url ? { create: [{ url: r.image_url, position: 0, alt: r.titre }] } : undefined,
      },
    });
    created++;
  }
  await audit(user.id, "catalog.import", { type: "shop", id: shop.id }, { created, errors: report.errors.length });
  revalidatePath("/vendeur/produits");
  return { ok: `${created} produit(s) importé(s) en brouillon. ${report.errors.length ? `${report.errors.length} ligne(s) ignorée(s) : ${report.errors.slice(0, 5).map((e) => `L${e.line} ${e.message}`).join(" · ")}` : ""}` };
}

export async function publishAllDraftsAction() {
  const { shop } = await requireShop("MANAGER");
  await db.product.updateMany({ where: { shopId: shop.id, status: "DRAFT", deletedAt: null, images: { some: {} } }, data: { status: "ACTIVE" } });
  revalidatePath("/vendeur/produits");
}

// ───────────── Commandes ─────────────

export async function updateOrderStatusAction(to: SubOrderStatus, form: FormData) {
  const { shop, user } = await requireShop("STAFF");
  const id = String(form.get("id"));
  await updateSubOrderStatus(shop.id, id, to, user.id, String(form.get("note") ?? "").slice(0, 300) || undefined);
  revalidatePath("/vendeur", "layout");
  // Redirection explicite : affichage du nouvel état garanti même si un préchargement est en cours.
  redirect(`/vendeur/commandes/${encodeURIComponent(id)}`);
}

export async function updatePaymentAction(to: PaymentStatus, form: FormData) {
  const { shop, user } = await requireShop("MANAGER");
  await sellerSetPayment(shop.id, String(form.get("id")), to, user.id);
  await audit(user.id, "order.payment_update", { type: "subOrder", id: String(form.get("id")) }, { to });
  revalidatePath("/vendeur", "layout");
  redirect(`/vendeur/commandes/${encodeURIComponent(String(form.get("id")))}`);
}

export async function sellerNoteAction(form: FormData) {
  const { shop } = await requireShop("STAFF");
  await db.subOrder.updateMany({ where: { id: String(form.get("id")), shopId: shop.id }, data: { sellerNote: String(form.get("note") ?? "").slice(0, 1000) } });
  revalidatePath("/vendeur", "layout");
  redirect(`/vendeur/commandes/${encodeURIComponent(String(form.get("id")))}`);
}

// ───────────── Promotions / coupons ─────────────

const couponSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,20}$/, "Code : 3 à 20 caractères (lettres, chiffres)"),
  percentOff: optInt, amountOff: optInt, maxUses: optInt, startsAt: optDate, endsAt: optDate,
});

export async function createCouponAction(_: FormState, form: FormData): Promise<FormState> {
  const { shop } = await requireShop("MANAGER");
  const ent = await getShopEntitlements(shop.id);
  if (!ent.features.promotions) return { error: "Les codes promo sont disponibles avec l'offre Pro ou Business." };
  const d = couponSchema.safeParse(Object.fromEntries(form));
  if (!d.success) return { error: d.error.issues[0].message };
  if (!d.data.percentOff === !d.data.amountOff) return { error: "Indiquez soit un pourcentage, soit un montant." };
  if (d.data.percentOff != null && (d.data.percentOff < 1 || d.data.percentOff > 90)) return { error: "Pourcentage entre 1 et 90." };
  try {
    await db.coupon.create({ data: { ...d.data, shopId: shop.id, scope: "order", currency: shop.country.currency } });
  } catch {
    return { error: "Ce code existe déjà." };
  }
  revalidatePath("/vendeur/promotions");
  return { ok: "Code promo créé." };
}

export async function toggleCouponAction(form: FormData) {
  const { shop } = await requireShop("MANAGER");
  const c = await db.coupon.findFirst({ where: { id: String(form.get("id")), shopId: shop.id } });
  if (c) await db.coupon.update({ where: { id: c.id }, data: { active: !c.active } });
  revalidatePath("/vendeur/promotions");
}

// ───────────── Abonnement ─────────────

export async function subscribeAction(_: FormState, form: FormData): Promise<FormState> {
  const { shop, user } = await requireShop("OWNER");
  const plan = String(form.get("plan"));
  const interval = form.get("interval") === "yearly" ? "yearly" : "monthly";
  const coupon = String(form.get("coupon") ?? "").trim() || undefined;
  try {
    const r = await requestSubscription(shop.id, user.id, plan, interval, coupon);
    revalidatePath("/vendeur/abonnement");
    if (r.kind === "trial") return { ok: "Période d'essai activée. Profitez de toutes les fonctionnalités !" };
    if (r.kind === "active") return { ok: "Offre activée." };
    return { ok: `Demande enregistrée (réf. ${r.transaction.id.slice(-8).toUpperCase()}). Effectuez le paiement selon les instructions ; l'offre sera activée après validation.` };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ───────────── Équipe (comptes collaborateurs) ─────────────

export async function addStaffAction(_: FormState, form: FormData): Promise<FormState> {
  const { shop, user } = await requireShop("OWNER");
  const ent = await getShopEntitlements(shop.id);
  const count = await db.shopMember.count({ where: { shopId: shop.id, role: { not: "OWNER" } } });
  if (count >= ent.features.staffAccounts) return { error: `Votre offre permet ${ent.features.staffAccounts} collaborateur(s).` };
  const raw = String(form.get("identifier") ?? "").trim();
  const role = form.get("role") === "MANAGER" ? "MANAGER" : "STAFF";
  const phone = raw.includes("@") ? null : normalizePhone(raw, shop.countryCode);
  const target = await db.user.findFirst({ where: raw.includes("@") ? { email: raw.toLowerCase() } : { phone: phone ?? "-" } });
  if (!target) return { error: "Aucun compte trouvé. Le collaborateur doit d'abord créer son compte." };
  if (target.id === user.id) return { error: "Vous êtes déjà propriétaire." };
  await db.shopMember.upsert({ where: { shopId_userId: { shopId: shop.id, userId: target.id } }, create: { shopId: shop.id, userId: target.id, role }, update: { role } });
  await audit(user.id, "shop.staff_add", { type: "shop", id: shop.id }, { userId: target.id, role });
  revalidatePath("/vendeur/parametres");
  return { ok: "Collaborateur ajouté." };
}

export async function removeStaffAction(form: FormData) {
  const { shop, user } = await requireShop("OWNER");
  await db.shopMember.deleteMany({ where: { shopId: shop.id, userId: String(form.get("userId")), role: { not: "OWNER" } } });
  await audit(user.id, "shop.staff_remove", { type: "shop", id: shop.id }, { userId: String(form.get("userId")) });
  revalidatePath("/vendeur/parametres");
}

export async function supportTicketAction(_: FormState, form: FormData): Promise<FormState> {
  const { user } = await requireShop("STAFF");
  const subject = String(form.get("subject") ?? "").trim().slice(0, 120);
  const message = String(form.get("message") ?? "").trim().slice(0, 3000);
  if (subject.length < 3 || message.length < 10) return { error: "Précisez le sujet et votre message." };
  if (!(await rateLimit(`ticket:${user.id}`, 10, 86400))) return { error: "Trop de demandes aujourd'hui." };
  await db.supportTicket.create({ data: { userId: user.id, name: user.name, contact: user.phone ?? user.email ?? "", subject, message } });
  return { ok: "Demande envoyée. L'équipe vous répond rapidement." };
}
