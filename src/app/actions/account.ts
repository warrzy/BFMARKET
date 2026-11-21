"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth/guards";
import { getCurrentUser, destroySession } from "@/server/auth/session";
import { verifyPassword } from "@/server/auth/password";
import { audit } from "@/server/audit";
import { rateLimit } from "@/server/rate-limit";
import { clientIp } from "@/server/request";
import type { FormState } from "./auth";

export async function toggleFavoriteAction(productId: string): Promise<{ ok: boolean; favorite?: boolean; login?: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, login: true };
  const existing = await db.favorite.findUnique({ where: { userId_productId: { userId: user.id, productId } } });
  if (existing) await db.favorite.delete({ where: { userId_productId: { userId: user.id, productId } } });
  else {
    const p = await db.product.findFirst({ where: { id: productId, deletedAt: null } });
    if (!p) return { ok: false };
    await db.favorite.create({ data: { userId: user.id, productId } });
  }
  revalidatePath("/favoris");
  return { ok: true, favorite: !existing };
}

export async function markNotificationsReadAction() {
  const user = await requireUser();
  await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/compte");
}

/**
 * Suppression du compte (droit à l'effacement) : anonymisation des données personnelles.
 * Les commandes sont conservées sans données identifiantes pour les obligations comptables des vendeurs.
 */
export async function deleteAccountAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const full = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(String(form.get("password") ?? ""), full.passwordHash))) return { error: "Mot de passe incorrect." };
  const owned = await db.shopMember.findMany({ where: { userId: user.id, role: "OWNER" } });
  if (["SUPER_ADMIN"].includes(full.role)) return { error: "Un super administrateur ne peut pas supprimer son compte ainsi." };
  await db.$transaction(async (t) => {
    for (const m of owned) await t.shop.update({ where: { id: m.shopId }, data: { status: "CLOSED" } });
    await t.order.updateMany({ where: { userId: user.id }, data: { buyerName: "Client supprimé", buyerPhone: "-", buyerEmail: null, landmark: null, note: null, userId: null } });
    await t.review.updateMany({ where: { userId: user.id }, data: { authorName: "Client", userId: null } });
    await t.session.deleteMany({ where: { userId: user.id } });
    await t.favorite.deleteMany({ where: { userId: user.id } });
    await t.notification.deleteMany({ where: { userId: user.id } });
    await t.user.update({ where: { id: user.id }, data: { email: null, phone: null, name: "Compte supprimé", passwordHash: "!", deletedAt: new Date() } });
  });
  await audit(user.id, "user.delete_self", { type: "user", id: user.id }, { shopsClosed: owned.length });
  await destroySession();
  redirect("/?compte=supprime");
}

const reportSchema = z.object({
  productId: z.string().optional(), shopId: z.string().optional(),
  reason: z.enum(["Produit interdit ou dangereux", "Contrefaçon", "Arnaque / fraude", "Contenu choquant", "Informations trompeuses", "Autre"]),
  details: z.string().trim().max(2000).optional().default(""),
});

export async function reportAction(_: FormState, form: FormData): Promise<FormState> {
  if (!(await rateLimit(`report:${await clientIp()}`, 10, 3600))) return { error: "Trop de signalements. Réessayez plus tard." };
  const d = reportSchema.safeParse(Object.fromEntries(form));
  if (!d.success || (!d.data.productId && !d.data.shopId)) return { error: "Choisissez un motif." };
  const user = await getCurrentUser();
  let shopId = d.data.shopId ?? null;
  if (d.data.productId) {
    const p = await db.product.findUnique({ where: { id: d.data.productId } });
    if (!p) return { error: "Produit introuvable." };
    shopId = p.shopId;
  }
  await db.report.create({ data: { targetType: d.data.productId ? "product" : "shop", productId: d.data.productId ?? null, shopId, reporterId: user?.id ?? null, reason: d.data.reason, details: d.data.details } });
  return { ok: "Merci. Notre équipe de modération va examiner ce signalement." };
}
