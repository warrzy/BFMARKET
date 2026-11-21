"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma, Role } from "@prisma/client";
import { db } from "@/server/db";
import { assertCountryAccess, requireAdmin } from "@/server/auth/guards";
import { audit } from "@/server/audit";
import { slugify } from "@/lib/slug";
import { activateSubscriptionFromTransaction } from "@/server/modules/subscriptions/service";
import { notifyShopOwners } from "@/server/modules/notifications/service";
import { storeImage, filesFrom } from "@/server/storage";
import type { FormState } from "./auth";

// Chaque action vérifie le rôle côté serveur, le périmètre pays pour les
// administrateurs locaux, et journalise l'opération (AuditLog).

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

// ───────────── Boutiques ─────────────

export async function verifyShopAction(decisionArg: string, form: FormData) {
  const admin = await requireAdmin();
  const shop = await db.shop.findUniqueOrThrow({ where: { id: str(form, "id") } });
  assertCountryAccess(admin, shop.countryCode);
  const decision = decisionArg === "VERIFIED" ? "VERIFIED" : decisionArg === "REJECTED" ? "REJECTED" : "NONE";
  await db.shop.update({ where: { id: shop.id }, data: { verification: decision, verifiedAt: decision === "VERIFIED" ? new Date() : null } });
  await audit(admin.id, `shop.verification.${decision.toLowerCase()}`, { type: "shop", id: shop.id, countryCode: shop.countryCode }, { note: str(form, "note") });
  await notifyShopOwners(shop.id, "shop.verification", decision === "VERIFIED" ? "Boutique vérifiée ✓" : "Vérification de la boutique",
    decision === "VERIFIED" ? "Le badge « Boutique vérifiée » est maintenant affiché." : `Statut : ${decision}. ${str(form, "note")}`, "/vendeur/boutique");
  revalidatePath("/admin/boutiques");
}

export async function setShopStatusAction(statusArg: string, form: FormData) {
  const admin = await requireAdmin();
  const shop = await db.shop.findUniqueOrThrow({ where: { id: str(form, "id") } });
  assertCountryAccess(admin, shop.countryCode);
  const status = statusArg === "SUSPENDED" ? "SUSPENDED" : "ACTIVE";
  await db.shop.update({ where: { id: shop.id }, data: { status } });
  await audit(admin.id, `shop.${status.toLowerCase()}`, { type: "shop", id: shop.id, countryCode: shop.countryCode }, { reason: str(form, "reason") });
  revalidatePath("/admin/boutiques");
}

// ───────────── Produits (modération) ─────────────

export async function moderateProductAction(decision: "approve" | "reject" | "hide", form: FormData) {
  const admin = await requireAdmin();
  const p = await db.product.findUniqueOrThrow({ where: { id: str(form, "id") }, include: { shop: true } });
  assertCountryAccess(admin, p.shop.countryCode);
  if (!["approve", "reject", "hide"].includes(decision)) return;
  const status = decision === "approve" ? "ACTIVE" : decision === "reject" ? "REJECTED" : "UNAVAILABLE";
  const note = str(form, "note").slice(0, 300) || null;
  await db.product.update({ where: { id: p.id }, data: { status, moderationNote: decision === "approve" ? null : note } });
  await audit(admin.id, `product.${decision}`, { type: "product", id: p.id, countryCode: p.shop.countryCode }, { note });
  if (decision !== "approve") await notifyShopOwners(p.shopId, "product.moderation", "Produit modéré", `« ${p.title} » : ${note ?? "non conforme aux règles"}`, `/vendeur/produits/${p.id}`);
  revalidatePath("/admin/produits");
}

// ───────────── Utilisateurs et rôles ─────────────

export async function setUserRoleAction(form: FormData) {
  const admin = await requireAdmin(["SUPER_ADMIN"]);
  const role = str(form, "role") as Role;
  if (!["BUYER", "SELLER", "AGENT", "COUNTRY_ADMIN", "ADMIN", "SUPER_ADMIN"].includes(role)) return;
  const id = str(form, "id");
  if (id === admin.id) return; // pas d'auto-rétrogradation
  const countries = str(form, "countries").split(",").map((c) => c.trim().toUpperCase()).filter((c) => /^[A-Z]{2}$/.test(c));
  await db.user.update({ where: { id }, data: { role, adminCountries: role === "COUNTRY_ADMIN" ? countries : [] } });
  await audit(admin.id, "user.role", { type: "user", id }, { role, countries });
  revalidatePath("/admin/utilisateurs");
}

export async function suspendUserAction(form: FormData) {
  const admin = await requireAdmin(["ADMIN", "SUPER_ADMIN"]);
  const id = str(form, "id");
  if (id === admin.id) return;
  const user = await db.user.findUniqueOrThrow({ where: { id } });
  if (user.role === "SUPER_ADMIN" && admin.role !== "SUPER_ADMIN") return;
  const suspend = !user.suspendedAt;
  await db.$transaction([
    db.user.update({ where: { id }, data: { suspendedAt: suspend ? new Date() : null } }),
    ...(suspend ? [db.session.deleteMany({ where: { userId: id } })] : []),
  ]);
  await audit(admin.id, suspend ? "user.suspend" : "user.unsuspend", { type: "user", id });
  revalidatePath("/admin/utilisateurs");
}

// ───────────── Catégories ─────────────

const categorySchema = z.object({
  id: z.string().optional(), nameFr: z.string().trim().min(2).max(60), nameEn: z.string().trim().min(2).max(60),
  parentId: z.string().optional(), icon: z.string().trim().max(30).optional().default("tag"), sortOrder: z.coerce.number().int().default(100),
  attributes: z.string().optional().default("[]"),
});

export async function saveCategoryAction(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin(["ADMIN", "SUPER_ADMIN"]);
  const d = categorySchema.safeParse(Object.fromEntries(form));
  if (!d.success) return { error: "Champs invalides." };
  let attributes: Prisma.InputJsonValue;
  try {
    attributes = z.array(z.object({ key: z.string(), labelFr: z.string(), labelEn: z.string(), type: z.enum(["select", "text", "number"]), options: z.array(z.string()).optional() })).parse(JSON.parse(d.data.attributes || "[]"));
  } catch {
    return { error: "Attributs : JSON invalide." };
  }
  const data = { nameFr: d.data.nameFr, nameEn: d.data.nameEn, parentId: d.data.parentId || null, icon: d.data.icon, sortOrder: d.data.sortOrder, attributes };
  const cat = d.data.id
    ? await db.category.update({ where: { id: d.data.id }, data })
    : await db.category.create({ data: { ...data, slug: slugify(d.data.nameFr) + (await db.category.count({ where: { slug: slugify(d.data.nameFr) } }) ? `-${Date.now() % 1000}` : "") } });
  await audit(admin.id, d.data.id ? "category.update" : "category.create", { type: "category", id: cat.id });
  revalidatePath("/admin/categories");
  return { ok: "Catégorie enregistrée." };
}

export async function toggleCategoryAction(form: FormData) {
  const admin = await requireAdmin(["ADMIN", "SUPER_ADMIN"]);
  const c = await db.category.findUniqueOrThrow({ where: { id: str(form, "id") } });
  await db.category.update({ where: { id: c.id }, data: { active: !c.active } });
  await audit(admin.id, "category.toggle", { type: "category", id: c.id }, { active: !c.active });
  revalidatePath("/admin/categories");
}

// ───────────── Pays et villes ─────────────

export async function toggleCountryAction(form: FormData) {
  const admin = await requireAdmin(["SUPER_ADMIN"]);
  const c = await db.country.findUniqueOrThrow({ where: { code: str(form, "code") } });
  await db.country.update({ where: { code: c.code }, data: { active: !c.active } });
  await audit(admin.id, c.active ? "country.disable" : "country.enable", { type: "country", id: c.code, countryCode: c.code });
  revalidatePath("/admin/pays");
}

export async function addCityAction(form: FormData) {
  const admin = await requireAdmin();
  const countryCode = str(form, "countryCode");
  assertCountryAccess(admin, countryCode);
  const name = str(form, "name").slice(0, 80);
  if (name.length < 2) return;
  const lat = Number(form.get("lat")) || null;
  const lng = Number(form.get("lng")) || null;
  await db.city.upsert({ where: { countryCode_slug: { countryCode, slug: slugify(name) } }, create: { name, slug: slugify(name), countryCode, lat, lng }, update: { active: true, lat, lng } });
  await audit(admin.id, "city.add", { type: "country", id: countryCode, countryCode }, { name });
  revalidatePath("/admin/pays");
}

export async function toggleCityAction(form: FormData) {
  const admin = await requireAdmin();
  const city = await db.city.findUniqueOrThrow({ where: { id: str(form, "id") } });
  assertCountryAccess(admin, city.countryCode);
  await db.city.update({ where: { id: city.id }, data: { active: !city.active } });
  await audit(admin.id, "city.toggle", { type: "city", id: city.id, countryCode: city.countryCode });
  revalidatePath("/admin/pays");
}

// ───────────── Abonnements ─────────────

export async function savePlanPriceAction(form: FormData) {
  const admin = await requireAdmin(["SUPER_ADMIN"]);
  const d = z.object({ planId: z.string(), countryCode: z.string().length(2), currency: z.string().regex(/^[A-Z]{3}$/), monthly: z.coerce.number().int().min(0), yearly: z.coerce.number().int().min(0) }).safeParse(Object.fromEntries(form));
  if (!d.success) return;
  await db.planPrice.upsert({
    where: { planId_countryCode: { planId: d.data.planId, countryCode: d.data.countryCode } },
    create: d.data, update: { currency: d.data.currency, monthly: d.data.monthly, yearly: d.data.yearly },
  });
  await audit(admin.id, "plan.price", { type: "plan", id: d.data.planId, countryCode: d.data.countryCode }, d.data);
  revalidatePath("/admin/abonnements");
}

export async function savePlanAction(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin(["SUPER_ADMIN"]);
  const id = str(form, "id");
  const maxRaw = str(form, "maxProducts");
  const features = {
    maxProducts: maxRaw === "" ? null : Math.max(0, Number(maxRaw) || 0),
    staffAccounts: Math.max(0, Number(form.get("staffAccounts")) || 0),
    ...Object.fromEntries(["promotions", "advancedStats", "customization", "import", "ai", "featured", "prioritySupport", "advancedStock"].map((k) => [k, form.get(k) === "on"])),
  };
  await db.plan.update({
    where: { id },
    data: { nameFr: str(form, "nameFr"), nameEn: str(form, "nameEn"), descriptionFr: str(form, "descriptionFr"), trialDays: Math.max(0, Number(form.get("trialDays")) || 0), features, active: form.get("active") === "on" },
  });
  await audit(admin.id, "plan.update", { type: "plan", id }, features);
  revalidatePath("/admin/abonnements");
  return { ok: "Offre mise à jour." };
}

export async function validateSubscriptionPaymentAction(decision: "approve" | "reject", form: FormData) {
  const admin = await requireAdmin(["ADMIN", "SUPER_ADMIN"]);
  const tx = await db.transaction.findUniqueOrThrow({ where: { id: str(form, "id") } });
  if (tx.purpose !== "subscription" || tx.status !== "PENDING") return;
  const approve = decision === "approve";
  await db.transaction.update({ where: { id: tx.id }, data: { status: approve ? "SUCCEEDED" : "FAILED", validatedById: admin.id, failureReason: approve ? null : str(form, "note") || "Paiement non constaté", providerRef: str(form, "providerRef") || null } });
  if (approve) await activateSubscriptionFromTransaction(tx.id);
  await audit(admin.id, approve ? "payment.validate" : "payment.reject", { type: "transaction", id: tx.id }, { amount: tx.amount, currency: tx.currency, providerRef: str(form, "providerRef") });
  revalidatePath("/admin/abonnements");
}

export async function createPlatformCouponAction(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin(["SUPER_ADMIN"]);
  const code = str(form, "code").toUpperCase();
  if (!/^[A-Z0-9_-]{3,20}$/.test(code)) return { error: "Code invalide." };
  const percentOff = Number(form.get("percentOff")) || null;
  if (!percentOff || percentOff < 1 || percentOff > 100) return { error: "Pourcentage entre 1 et 100." };
  const existing = await db.coupon.findFirst({ where: { code, shopId: null } });
  if (existing) return { error: "Ce code existe déjà." };
  await db.coupon.create({ data: { code, scope: "subscription", percentOff, maxUses: Number(form.get("maxUses")) || null, endsAt: form.get("endsAt") ? new Date(str(form, "endsAt")) : null } });
  await audit(admin.id, "coupon.create", { type: "coupon", id: code }, { percentOff });
  revalidatePath("/admin/abonnements");
  return { ok: "Coupon créé." };
}

// ───────────── Paiements ─────────────

export async function setProviderAction(form: FormData) {
  const admin = await requireAdmin(["SUPER_ADMIN"]);
  const id = str(form, "id");
  const cfg = await db.paymentProviderConfig.findUniqueOrThrow({ where: { id } });
  const enabled = form.get("enabled") === "on";
  const mode = str(form, "mode") === "live" ? "live" : "test";
  await db.paymentProviderConfig.update({ where: { id }, data: { enabled, mode } });
  await audit(admin.id, "payment.provider", { type: "provider", id: cfg.provider, countryCode: cfg.countryCode }, { enabled, mode });
  revalidatePath("/admin/paiements");
}

export async function adminSetOrderPaymentAction(form: FormData) {
  const admin = await requireAdmin(["ADMIN", "SUPER_ADMIN"]);
  const sub = await db.subOrder.findUniqueOrThrow({ where: { id: str(form, "id") } });
  const to = str(form, "paymentStatus");
  if (!["PAID", "UNPAID", "REFUNDED", "FAILED"].includes(to)) return;
  await db.$transaction([
    db.subOrder.update({ where: { id: sub.id }, data: { paymentStatus: to as "PAID" } }),
    db.orderEvent.create({ data: { subOrderId: sub.id, type: "payment", fromValue: sub.paymentStatus, toValue: to, actorId: admin.id, note: "Intervention administrateur" } }),
  ]);
  await audit(admin.id, "order.payment_admin", { type: "subOrder", id: sub.id }, { from: sub.paymentStatus, to });
  revalidatePath("/admin/commandes");
}

// ───────────── Contenus ─────────────

export async function saveBannerAction(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin(["ADMIN", "SUPER_ADMIN"]);
  const titleFr = str(form, "titleFr");
  if (titleFr.length < 3) return { error: "Titre requis." };
  const href = str(form, "href");
  if (href && !href.startsWith("/") && !href.startsWith("https://")) return { error: "Lien : chemin interne ou https." };
  const [img] = filesFrom(form, "image");
  const imageUrl = img ? await storeImage(img, "banner", "platform") : undefined;
  const b = await db.banner.create({
    data: { titleFr, titleEn: str(form, "titleEn") || titleFr, subtitleFr: str(form, "subtitleFr") || null, subtitleEn: str(form, "subtitleEn") || null, href: href || null, imageUrl, countryCode: str(form, "countryCode") || null, placement: str(form, "placement") || "home_strip" },
  });
  await audit(admin.id, "banner.create", { type: "banner", id: b.id });
  revalidatePath("/admin/contenus");
  revalidatePath("/");
  return { ok: "Bannière créée." };
}

export async function toggleBannerAction(form: FormData) {
  const admin = await requireAdmin(["ADMIN", "SUPER_ADMIN"]);
  const b = await db.banner.findUniqueOrThrow({ where: { id: str(form, "id") } });
  await db.banner.update({ where: { id: b.id }, data: { active: !b.active } });
  await audit(admin.id, "banner.toggle", { type: "banner", id: b.id });
  revalidatePath("/admin/contenus");
}

// ───────────── Signalements et litiges ─────────────

export async function resolveReportAction(status: "RESOLVED" | "DISMISSED" | "REVIEWING", form: FormData) {
  const admin = await requireAdmin();
  if (!["RESOLVED", "DISMISSED", "REVIEWING"].includes(status)) return;
  const kind = str(form, "kind");
  const id = str(form, "id");
  if (kind === "dispute") await db.dispute.update({ where: { id }, data: { status, resolution: str(form, "resolution") || null } });
  else await db.report.update({ where: { id }, data: { status, resolution: str(form, "resolution") || null } });
  await audit(admin.id, `${kind}.${status.toLowerCase()}`, { type: kind, id }, { resolution: str(form, "resolution") });
  revalidatePath("/admin/signalements");
}

export async function closeTicketAction(form: FormData) {
  const admin = await requireAdmin();
  await db.supportTicket.update({ where: { id: str(form, "id") }, data: { status: "closed" } });
  await audit(admin.id, "ticket.close", { type: "ticket", id: str(form, "id") });
  revalidatePath("/admin/support");
}

// ───────────── Paramètres ─────────────

export async function saveSettingsAction(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin(["SUPER_ADMIN"]);
  const wa = str(form, "supportWhatsapp").replace(/[^\d]/g, "");
  const moderation = str(form, "moderation") === "pre" ? "pre" : "post";
  await db.$transaction([
    db.setting.upsert({ where: { key: "platform.supportWhatsapp" }, create: { key: "platform.supportWhatsapp", value: wa }, update: { value: wa } }),
    db.setting.upsert({ where: { key: "catalog.moderation" }, create: { key: "catalog.moderation", value: moderation }, update: { value: moderation } }),
  ]);
  await audit(admin.id, "settings.update", { type: "settings", id: "platform" }, { moderation, supportWhatsapp: wa ? "set" : "empty" });
  revalidatePath("/admin/parametres");
  return { ok: "Paramètres enregistrés." };
}
