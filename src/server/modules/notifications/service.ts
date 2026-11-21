import { db } from "@/server/db";

// Notifications : in-app (base) + canaux sortants pluggables.
// WhatsApp Business API : uniquement via l'intégration officielle (Cloud API), avec
// consentement explicite et modèles de messages approuvés — non activé dans ce socle.

export async function notifyUser(userId: string, type: string, title: string, body: string, href?: string) {
  await db.notification.create({ data: { userId, type, title, body, href } });
}

export async function notifyShopOwners(shopId: string, type: string, title: string, body: string, href?: string) {
  const members = await db.shopMember.findMany({ where: { shopId }, select: { userId: true } });
  if (members.length) {
    await db.notification.createMany({ data: members.map((m) => ({ userId: m.userId, type, title, body, href })) });
  }
}

/** Envoi d'un code de vérification. En dev : console. En prod : webhook vers votre passerelle SMS/e-mail. */
export async function deliverOtp(channel: "phone" | "email", destination: string, code: string) {
  const mode = process.env.OTP_DELIVERY ?? "console";
  if (mode === "webhook" && process.env.OTP_WEBHOOK_URL) {
    await fetch(process.env.OTP_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel, destination, message: `ECOM MARKET : votre code est ${code}. Il expire dans 10 minutes.` }),
      signal: AbortSignal.timeout(10000),
    });
    return { shown: false };
  }
  // En production, le mode console n'est autorisé qu'explicitement (préproduction / tests E2E).
  if (process.env.NODE_ENV === "production" && process.env.OTP_CONSOLE_IN_PRODUCTION !== "true") {
    throw new Error("Aucun canal d'envoi de code configuré (OTP_DELIVERY).");
  }
  console.info(`[OTP:${channel}] ${destination.replace(/.(?=.{3})/g, "•")} → ${code}`);
  return { shown: true };
}
