import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ECOM MARKET",
    short_name: "ECOM MARKET",
    description: "Toute l'Afrique de l'Ouest, un seul marché.",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF8F5",
    theme_color: "#F25412",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
