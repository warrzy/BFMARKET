import { headers } from "next/headers";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";

/** Journal des opérations sensibles. Ne jamais y mettre de mot de passe, code ou clé. */
export async function audit(
  actorId: string | null,
  action: string,
  target?: { type: string; id: string; countryCode?: string | null },
  metadata: Prisma.InputJsonValue = {},
) {
  let ip: string | null = null;
  try {
    const h = await headers();
    ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip");
  } catch {
    /* hors requête (seed, cron) */
  }
  await db.auditLog.create({
    data: {
      actorId, action, targetType: target?.type, targetId: target?.id,
      countryCode: target?.countryCode ?? null, metadata, ip,
    },
  });
}
