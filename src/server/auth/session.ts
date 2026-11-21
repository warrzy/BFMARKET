import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/server/db";
import { randomToken, sha256 } from "@/server/crypto";

export const SESSION_COOKIE = "em_session";
const SESSION_DAYS = 30;

export async function createSession(userId: string, userAgent?: string | null) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await db.session.create({
    data: { userId, tokenHash: sha256(token), expiresAt, userAgent: userAgent?.slice(0, 200) },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** Utilisateur courant (mis en cache pour la durée de la requête). */
export const getCurrentUser = cache(async () => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: {
      user: {
        select: {
          id: true, name: true, email: true, phone: true, role: true, locale: true,
          verifiedAt: true, suspendedAt: true, adminCountries: true, deletedAt: true,
        },
      },
    },
  });
  if (!session || session.expiresAt < new Date()) return null;
  if (session.user.suspendedAt || session.user.deletedAt) return null;
  return session.user;
});
