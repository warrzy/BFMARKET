import { NextResponse, type NextRequest } from "next/server";

// Évolution prévue : boutiques sur sous-domaine (nom-boutique.ecommarket.africa).
// Activé via SHOP_SUBDOMAINS_ENABLED=true + DNS wildcard ; réécrit vers /boutique/<slug>.
const RESERVED = new Set(["www", "app", "api", "admin", "static", "cdn", "mail"]);

export function middleware(req: NextRequest) {
  if (process.env.SHOP_SUBDOMAINS_ENABLED !== "true") return NextResponse.next();
  const root = process.env.ROOT_DOMAIN;
  const host = (req.headers.get("host") ?? "").split(":")[0];
  if (!root || !host.endsWith(`.${root}`)) return NextResponse.next();
  const sub = host.slice(0, -(root.length + 1));
  if (!sub || sub.includes(".") || RESERVED.has(sub) || !/^[a-z0-9-]+$/.test(sub)) return NextResponse.next();
  const url = req.nextUrl.clone();
  if (url.pathname === "/" || url.pathname === "") {
    url.pathname = `/boutique/${sub}`;
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next|api|uploads|favicon|icon).*)"] };
