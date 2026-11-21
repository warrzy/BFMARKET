import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Clock, MapPin, Phone, QrCode, RotateCcw, Search, Star, Truck } from "lucide-react";
import { db } from "@/server/db";
import { getI18n } from "@/i18n";
import { SiteShell } from "@/components/layout/SiteShell";
import { ProductGrid } from "@/components/product/ProductCard";
import { ShareBar } from "@/components/product/ShareBar";
import { WhatsAppIcon } from "@/components/layout/WhatsAppFab";
import { activePromoWhere, productCardSelect, publicProductWhere } from "@/server/modules/catalog/queries";
import { absoluteUrl } from "@/lib/utils";
import { waLink } from "@/lib/whatsapp";
import { formatPhoneInternational } from "@/lib/phone";
import { EmptyState } from "@/components/ui/EmptyState";

type P = { params: Promise<{ slug: string }>; searchParams: Promise<{ q?: string; section?: string }> };

const loadShop = (slug: string) =>
  db.shop.findFirst({
    where: { slug, status: "ACTIVE" },
    include: { city: true, country: true, sections: { orderBy: { position: "asc" } }, deliveryOptions: { where: { active: true } } },
  });

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const s = await loadShop((await params).slug);
  if (!s) return {};
  const url = absoluteUrl(`/boutique/${s.slug}`);
  const description = s.tagline ?? s.description.slice(0, 150);
  return {
    title: s.name, description, alternates: { canonical: url },
    openGraph: { url, title: `${s.name} — ECOM MARKET`, description, images: s.coverUrl || s.logoUrl ? [{ url: absoluteUrl((s.coverUrl ?? s.logoUrl)!) }] : undefined },
  };
}

export default async function ShopPage({ params, searchParams }: P) {
  const { slug } = await params;
  const sp = await searchParams;
  const shop = await loadShop(slug);
  if (!shop) notFound();
  const { tx, locale } = await getI18n();

  // Statistiques de visites (agrégées par jour, sans donnée personnelle)
  const day = new Date(new Date().toISOString().slice(0, 10));
  db.$transaction([
    db.shop.update({ where: { id: shop.id }, data: { visitCount: { increment: 1 } } }),
    db.shopVisitDaily.upsert({ where: { shopId_day: { shopId: shop.id, day } }, create: { shopId: shop.id, day, count: 1 }, update: { count: { increment: 1 } } }),
  ]).catch(() => {});

  const q = sp.q?.trim().slice(0, 80);
  const base = { ...publicProductWhere(), shopId: shop.id };
  const filtered = {
    ...base,
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" as const } }, { description: { contains: q, mode: "insensitive" as const } }] } : {}),
    ...(sp.section ? { shopSectionId: sp.section } : {}),
  };
  const [featured, promos, products, reviews, totalProducts] = await Promise.all([
    q || sp.section ? [] : db.product.findMany({ where: { ...base, featured: true }, select: productCardSelect, take: 6 }),
    q || sp.section ? [] : db.product.findMany({ where: { ...base, ...activePromoWhere() }, select: productCardSelect, take: 6 }),
    db.product.findMany({ where: filtered, select: productCardSelect, orderBy: [{ featured: "desc" }, { createdAt: "desc" }], take: 60 }),
    db.review.findMany({ where: { shopId: shop.id, hidden: false }, orderBy: { createdAt: "desc" }, take: 6 }),
    db.product.count({ where: base }),
  ]);
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const url = absoluteUrl(`/boutique/${shop.slug}`);
  const hours = shop.openingHours as Record<string, string>;
  const hourLabels: Record<string, string> = { lun_ven: tx("Lun – Ven", "Mon – Fri"), sam: tx("Samedi", "Saturday"), dim: tx("Dimanche", "Sunday") };

  return (
    <SiteShell whatsapp={shop.whatsapp} waMessage={`${tx("Bonjour", "Hello")} ${shop.name}, ${tx("je vous contacte depuis ECOM MARKET", "I'm contacting you from ECOM MARKET")} — ${url}`}>
      <div style={{ ["--accent" as string]: shop.accentColor }} data-theme={shop.theme}>
        <div className={`relative ${shop.theme === "minimal" ? "h-28 sm:h-40" : "h-40 sm:h-64"}`}
          style={{ background: shop.theme === "nuit" ? `linear-gradient(135deg, #0A0B1E, ${shop.accentColor})` : shop.theme === "minimal" ? shop.accentColor : `linear-gradient(135deg, ${shop.accentColor}, #11132F)` }}>
          {shop.theme === "kente" && <div className="pattern-kente absolute inset-0 opacity-80" aria-hidden />}
          {shop.coverUrl && <Image src={shop.coverUrl} alt="" fill priority sizes="100vw" className="object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
        <div className="container-x">
          <div className="relative -mt-12 flex flex-col gap-4 sm:-mt-16 sm:flex-row sm:items-end">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-3xl border-4 border-[rgb(var(--bg))] bg-[rgb(var(--surface))] shadow-lift sm:h-32 sm:w-32">
              {shop.logoUrl ? <Image src={shop.logoUrl} alt={shop.name} width={128} height={128} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center font-display text-4xl font-bold" style={{ color: shop.accentColor }}>{shop.name[0]}</div>}
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <h1 className="flex flex-wrap items-center gap-2 text-2xl font-extrabold sm:text-3xl">
                {shop.name}
                {shop.verification === "VERIFIED" && <span className="badge bg-night-900 text-white dark:bg-white dark:text-night-900"><BadgeCheck className="h-3.5 w-3.5" />{tx("Boutique vérifiée", "Verified shop")}</span>}
              </h1>
              {shop.tagline && <p className="mt-1 muted">{shop.tagline}</p>}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm muted">
                <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{[shop.neighborhood, shop.city?.name, locale === "en" ? shop.country.nameEn : shop.country.nameFr].filter(Boolean).join(", ")} {shop.country.flag}</span>
                <span>{totalProducts} {tx("produits", "products")}</span>
                {reviews.length > 0 && <span className="inline-flex items-center gap-1"><Star className="h-4 w-4 fill-gold-400 text-gold-400" />{avg.toFixed(1)}</span>}
              </div>
            </div>
            <div className="flex gap-2 pb-1">
              {shop.whatsapp && <a href={waLink(shop.whatsapp, `${tx("Bonjour", "Hello")} ${shop.name} !`)} target="_blank" rel="noopener noreferrer" className="btn-wa flex-1 sm:flex-none"><WhatsAppIcon className="h-5 w-5" />WhatsApp</a>}
              {shop.phone && <a href={`tel:${shop.phone}`} className="btn-ghost" aria-label={tx("Appeler", "Call")}><Phone className="h-4 w-4" /></a>}
            </div>
          </div>

          <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_300px]">
            <div className="min-w-0">
              <form className="relative mb-4" role="search">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 muted" />
                <input name="q" defaultValue={q} placeholder={tx(`Rechercher dans ${shop.name}`, `Search in ${shop.name}`)} className="input pl-10" />
              </form>
              {shop.sections.length > 0 && (
                <div className="scroll-row mb-4">
                  <Link href={`/boutique/${shop.slug}`} className={`chip ${!sp.section ? "chip-active" : ""}`}>{tx("Tout", "All")}</Link>
                  {shop.sections.map((s) => <Link key={s.id} href={`?section=${s.id}`} className={`chip ${sp.section === s.id ? "chip-active" : ""}`}>{s.name}</Link>)}
                </div>
              )}
              {featured.length > 0 && <><h2 className="mb-3 text-lg font-bold">{tx("Produits vedettes", "Featured products")}</h2><div className="mb-8"><ProductGrid items={featured} locale={locale} /></div></>}
              {promos.length > 0 && <><h2 className="mb-3 text-lg font-bold">{tx("Promotions", "Deals")}</h2><div className="mb-8"><ProductGrid items={promos} locale={locale} /></div></>}
              <h2 className="mb-3 text-lg font-bold">{q ? `${tx("Résultats", "Results")} (${products.length})` : tx("Catalogue", "Catalog")}</h2>
              {products.length ? <ProductGrid items={products} locale={locale} /> : <EmptyState title={tx("Aucun produit trouvé.", "No products found.")} />}
            </div>

            <aside className="space-y-4">
              {shop.description && <div className="card p-4"><h3 className="mb-2 font-bold">{tx("À propos", "About")}</h3><p className="whitespace-pre-line text-sm muted">{shop.description}</p></div>}
              {Object.keys(hours).length > 0 && (
                <div className="card p-4"><h3 className="mb-2 flex items-center gap-2 font-bold"><Clock className="h-4 w-4" />{tx("Horaires", "Opening hours")}</h3>
                  <dl className="space-y-1 text-sm">{Object.entries(hours).map(([k, v]) => <div key={k} className="flex justify-between"><dt className="muted">{hourLabels[k] ?? k}</dt><dd className="font-medium">{v}</dd></div>)}</dl></div>
              )}
              {(shop.deliveryPolicy || shop.deliveryOptions.length > 0) && (
                <div className="card p-4"><h3 className="mb-2 flex items-center gap-2 font-bold"><Truck className="h-4 w-4" />{tx("Livraison", "Delivery")}</h3>
                  {shop.deliveryPolicy && <p className="text-sm muted">{shop.deliveryPolicy}</p>}</div>
              )}
              {shop.returnPolicy && <div className="card p-4"><h3 className="mb-2 flex items-center gap-2 font-bold"><RotateCcw className="h-4 w-4" />{tx("Retours", "Returns")}</h3><p className="text-sm muted">{shop.returnPolicy}</p></div>}
              {(shop.address || shop.whatsapp) && (
                <div className="card p-4 text-sm"><h3 className="mb-2 font-bold">{tx("Contact", "Contact")}</h3>
                  {shop.address && <p className="muted">{shop.address}</p>}
                  {shop.whatsapp && <p className="mt-1">WhatsApp : <span className="font-medium">{formatPhoneInternational(shop.whatsapp)}</span></p>}
                </div>
              )}
              <div className="card p-4">
                <h3 className="mb-2 flex items-center gap-2 font-bold"><QrCode className="h-4 w-4" />{tx("QR code de la boutique", "Shop QR code")}</h3>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/qr?path=/boutique/${shop.slug}`} alt="QR code" width={160} height={160} className="mx-auto rounded-xl bg-white p-2" loading="lazy" />
                <p className="mt-2 break-all text-center text-xs muted">{url}</p>
              </div>
              <div className="card p-4"><ShareBar url={url} text={`${shop.name} ${tx("sur ECOM MARKET", "on ECOM MARKET")}`} label={tx("Partager", "Share")} /></div>
              {reviews.length > 0 && (
                <div className="card p-4"><h3 className="mb-2 font-bold">{tx("Avis vérifiés", "Verified reviews")}</h3>
                  <ul className="space-y-3 text-sm">{reviews.map((r) => <li key={r.id}><span className="font-semibold">{r.authorName}</span> · {"★".repeat(r.rating)}<p className="muted">{r.comment}</p></li>)}</ul></div>
              )}
              <Link href={`/signaler?shop=${shop.id}`} className="block text-center text-xs muted hover:text-red-600">{tx("Signaler cette boutique", "Report this shop")}</Link>
            </aside>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
