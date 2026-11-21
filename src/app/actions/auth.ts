"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/server/db";
import { dummyVerify, hashPassword, verifyPassword } from "@/server/auth/password";
import { createSession, destroySession, getCurrentUser } from "@/server/auth/session";
import { numericCode, sha256 } from "@/server/crypto";
import { rateLimit } from "@/server/rate-limit";
import { clientIp } from "@/server/request";
import { normalizePhone } from "@/lib/phone";
import { deliverOtp } from "@/server/modules/notifications/service";
import { audit } from "@/server/audit";

export type FormState = { error?: string; ok?: string; devCode?: string } | undefined;

/** Affichage du code à l'écran : développement, ou préproduction avec OTP_SHOW_ON_SCREEN=true. Jamais en production réelle. */
function showOtpOnScreen() {
  return process.env.NODE_ENV !== "production" || process.env.OTP_SHOW_ON_SCREEN === "true";
}

const safeNext = (n: unknown) => (typeof n === "string" && n.startsWith("/") && !n.startsWith("//") ? n : null);

function parseIdentifier(raw: string, country?: string): { email?: string; phone?: string } | null {
  const v = raw.trim();
  if (v.includes("@")) return z.string().email().safeParse(v.toLowerCase()).success ? { email: v.toLowerCase() } : null;
  const phone = normalizePhone(v, country);
  return phone ? { phone } : null;
}

const signupSchema = z.object({
  name: z.string().trim().min(2, "Nom trop court").max(80),
  identifier: z.string().trim().min(5).max(120),
  country: z.string().length(2),
  password: z.string().min(8, "Mot de passe : 8 caractères minimum").max(128),
  intent: z.enum(["buyer", "seller"]).default("buyer"),
  terms: z.literal("on", { errorMap: () => ({ message: "Veuillez accepter les conditions." }) }),
});

export async function signupAction(_: FormState, form: FormData): Promise<FormState> {
  const ip = await clientIp();
  if (!(await rateLimit(`signup:${ip}`, 8, 3600))) return { error: "Trop de tentatives. Réessayez plus tard." };
  const d = signupSchema.safeParse(Object.fromEntries(form));
  if (!d.success) return { error: d.error.issues[0].message };
  const id = parseIdentifier(d.data.identifier, d.data.country);
  if (!id) return { error: "Téléphone ou e-mail invalide." };
  const exists = await db.user.findFirst({ where: id.email ? { email: id.email } : { phone: id.phone } });
  if (exists) return { error: "Un compte existe déjà avec cet identifiant. Connectez-vous." };
  const user = await db.user.create({
    data: { name: d.data.name, ...id, countryCode: d.data.country, passwordHash: await hashPassword(d.data.password), role: d.data.intent === "seller" ? "SELLER" : "BUYER" },
  });
  await createSession(user.id, (await headers()).get("user-agent"));
  const sent = await sendCode(user.id);
  redirect(`/verification?next=${encodeURIComponent(d.data.intent === "seller" ? "/ouvrir-boutique" : "/")}${sent.devCode ? `&dev=${sent.devCode}` : ""}`);
}

async function sendCode(userId: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const code = numericCode(6);
  await db.verificationCode.create({
    data: { userId, channel: user.phone ? "phone" : "email", codeHash: sha256(`${userId}:${code}`), expiresAt: new Date(Date.now() + 10 * 60_000) },
  });
  const r = await deliverOtp(user.phone ? "phone" : "email", (user.phone ?? user.email)!, code);
  // En développement uniquement, le code est affiché à l'écran pour faciliter les tests.
  return { devCode: r.shown && showOtpOnScreen() ? code : undefined };
}

export async function resendCodeAction(): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Session expirée." };
  if (!(await rateLimit(`otp-send:${user.id}`, 4, 3600))) return { error: "Trop d'envois. Réessayez dans une heure." };
  const r = await sendCode(user.id);
  return { ok: "Nouveau code envoyé.", devCode: r.devCode };
}

export async function verifyCodeAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  const code = String(form.get("code") ?? "").replace(/\D/g, "");
  if (!(await rateLimit(`otp-check:${user.id}`, 10, 900))) return { error: "Trop de tentatives. Patientez 15 minutes." };
  const vc = await db.verificationCode.findFirst({ where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } });
  if (!vc || vc.attempts >= 5) return { error: "Code expiré. Demandez un nouveau code." };
  if (vc.codeHash !== sha256(`${user.id}:${code}`)) {
    await db.verificationCode.update({ where: { id: vc.id }, data: { attempts: { increment: 1 } } });
    return { error: "Code incorrect." };
  }
  await db.$transaction([
    db.verificationCode.update({ where: { id: vc.id }, data: { usedAt: new Date() } }),
    db.user.update({ where: { id: user.id }, data: { verifiedAt: new Date() } }),
  ]);
  redirect(safeNext(form.get("next")) ?? "/");
}

const loginSchema = z.object({ identifier: z.string().trim().min(3).max(120), password: z.string().min(1).max(128) });

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const d = loginSchema.safeParse(Object.fromEntries(form));
  if (!d.success) return { error: "Identifiants requis." };
  const ip = await clientIp();
  const idKey = d.data.identifier.toLowerCase().replace(/\s/g, "");
  // Limitation par IP ET par identifiant (protection contre le bourrage d'identifiants)
  if (!(await rateLimit(`login-ip:${ip}`, 20, 900)) || !(await rateLimit(`login-id:${idKey}`, 8, 900))) {
    return { error: "Trop de tentatives de connexion. Patientez 15 minutes." };
  }
  const raw = d.data.identifier;
  const candidates = raw.includes("@") ? [{ email: raw.toLowerCase() }] : (["BF", "CI", "SN", "ML", "NE", "BJ", "TG", "GN", "GH", "NG"].map((c) => normalizePhone(raw, c)).filter(Boolean) as string[]).map((phone) => ({ phone }));
  const user = candidates.length ? await db.user.findFirst({ where: { OR: candidates, deletedAt: null } }) : null;
  const ok = user ? await verifyPassword(d.data.password, user.passwordHash) : await dummyVerify(d.data.password);
  if (!user || !ok) return { error: "Identifiant ou mot de passe incorrect." };
  if (user.suspendedAt) return { error: "Ce compte est suspendu. Contactez l'assistance." };
  await createSession(user.id, (await headers()).get("user-agent"));
  if (["ADMIN", "SUPER_ADMIN", "COUNTRY_ADMIN"].includes(user.role)) await audit(user.id, "admin.login", { type: "user", id: user.id });
  const next = safeNext(form.get("next"));
  if (next) redirect(next);
  const shop = await db.shopMember.findFirst({ where: { userId: user.id } });
  redirect(["ADMIN", "SUPER_ADMIN", "COUNTRY_ADMIN"].includes(user.role) ? "/admin" : shop ? "/vendeur" : "/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
