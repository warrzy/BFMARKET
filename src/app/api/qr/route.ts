import QRCode from "qrcode";
import { absoluteUrl } from "@/lib/utils";

// QR code SVG pour une URL INTERNE (boutique/produit) uniquement — pas de générateur ouvert.
export async function GET(req: Request) {
  const path = new URL(req.url).searchParams.get("path") ?? "/";
  if (!/^\/(boutique|produit)\/[a-z0-9-]+$/.test(path)) return new Response("Chemin invalide", { status: 400 });
  const svg = await QRCode.toString(absoluteUrl(path), { type: "svg", margin: 1, width: 512, color: { dark: "#11132F", light: "#FFFFFF" } });
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" } });
}
