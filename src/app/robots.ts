import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/vendeur", "/api/", "/compte", "/panier", "/commande/"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
