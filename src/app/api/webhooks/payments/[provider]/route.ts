import { handleWebhook } from "@/server/modules/payments/service";
import { rateLimit } from "@/server/rate-limit";

// Notifications des prestataires. Idempotent (WebhookEvent unique par provider+eventKey) et
// toujours revérifié par appel serveur au prestataire avant tout changement de statut.
export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!(await rateLimit(`webhook:${provider}:${ip}`, 120, 60))) return new Response("Too many requests", { status: 429 });
  const raw = await req.text();
  if (raw.length > 64_000) return new Response("Payload too large", { status: 413 });
  const result = await handleWebhook(provider, req.headers, raw);
  return new Response(result.status === 200 ? "OK" : "ERROR", { status: result.status });
}
