import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  // Préproduction / recette : aucune indexation (SITE_NOINDEX=true)
  if (process.env.SITE_NOINDEX === "true") return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/vendeur", "/api/", "/compte", "/panier", "/commande/"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
