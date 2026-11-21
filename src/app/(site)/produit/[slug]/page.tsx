import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Clock, Flag, MapPin, Package, Star, Truck } from "lucide-react";
import { db } from "@/server/db";
import { getI18n, interpolate } from "@/i18n";
import { SiteShell } from "@/components/layout/SiteShell";
import { Gallery } from "@/components/product/Gallery";
import { BuyBox } from "@/components/product/BuyBox";
import { ShareBar } from "@/components/product/ShareBar";
import { Price } from "@/components/ui/Price";
import { Countdown } from "@/components/ui/Countdown";
import { ProductRow } from "@/components/product/ProductCard";
import { TrackSeen } from "@/components/product/RecentlyViewed";
import { FavoriteButton } from "@/components/product/FavoriteButton";
import { getCurrentUser } from "@/server/auth/session";
import { listProducts } from "@/server/modules/catalog/queries";
import { effectivePrice, formatPrice, isPromoActive } from "@/lib/money";
import { absoluteUrl, richText } from "@/lib/utils";
import { formatPhoneInternational } from "@/lib/phone";

type P = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  return db.product.findFirst({
    where: { slug, deletedAt: null, status: { in: ["ACTIVE", "UNAVAILABLE"] }, shop: { status: "ACTIVE" } },
    include: {
      images: { orderBy: { position: "asc" } }, variants: true, category: { include: { parent: true } },
      shop: { include: { city: true, country: true, deliveryOptions: { where: { active: true } } } },
      reviews: { where: { hidden: false }, orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const p = await load((await params).slug);
  if (!p) return {};
  const price = formatPrice(effectivePrice(p), p.currency);
  const desc = p.seoDescription ?? `${price} · ${p.shop.name}, ${p.shop.city?.name ?? p.shop.country.nameFr}. ${p.description.replace(/\*\*/g, "").slice(0, 120)}`;
  const url = absoluteUrl(`/produit/${p.slug}`);
  return {
    title: p.seoTitle ?? p.title,
    description: desc,
    alternates: { canonical: url },
    openGraph: {
      type: "website", url, title: `${p.title} — ${price}`, description: desc, siteName: "ECOM MARKET",
      images: p.images[0] ? [{ url: absoluteUrl(p.images[0].url), width: 1200, height: 1200, alt: p.title }] : undefined,
    },
    twitter: { card: "summary_large_image", title: `${p.title} — ${price}`, description: desc },
  };
}

export default async function ProductPage({ params }: P) {
  const { slug } = await params;
  const p = await load(slug);
  if (!p) notFound();
  const { m, tx, locale } = await getI18n();
  db.product.update({ where: { id: p.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

  const user = await getCurrentUser();
  const isFav = user ? !!(await db.favorite.findUnique({ where: { userId_productId: { userId: user.id, productId: p.id } } })) : false;
  const similar = await listProducts({ id: { not: p.id }, categoryId: p.categoryId ?? undefined }, [{ viewCount: "desc" }], 12, { country: p.shop.countryCode });
  const url = absoluteUrl(`/produit/${p.slug}`);
  const unit = effectivePrice(p);
  const avg = p.reviews.length ? p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length : 0;
  const ref = p.sku || p.id.slice(-8).toUpperCase();
  const lowStock = p.stock != null && p.stock > 0 && p.stock <= (p.lowStockAlert ?? 5);

  const jsonLd = {
    "@context": "https://schema.org", "@type": "Product", name: p.title, sku: ref,
    image: p.images.map((i) => absoluteUrl(i.url)), description: p.description.replace(/\*\*/g, "").slice(0, 500),
    brand: { "@type": "Brand", name: p.shop.name },
    offers: { "@type": "Offer", price: unit, priceCurrency: p.currency, url, availability: p.stock === 0 || p.status !== "ACTIVE" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock" },
    ...(p.reviews.length ? { aggregateRating: { "@type": "AggregateRating", ratingValue: avg.toFixed(1), reviewCount: p.reviews.length } } : {}),
  };

  return (
    <SiteShell whatsapp={p.shop.whatsapp} waMessage={`${tx("Bonjour, je suis intéressé(e) par", "Hello, I'm interested in")} « ${p.title} » (${tx("réf.", "ref.")} ${ref}) — ${url}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <TrackSeen slug={p.slug} title={p.title} image={p.images[0]?.url} price={formatPrice(unit, p.currency, locale)} />
      <div className="container-x py-4 text-xs muted">
        <Link href="/" className="hover:underline">{m.nav.home}</Link>
        {p.category?.parent && <> / <Link href={`/categorie/${p.category.parent.slug}`} className="hover:underline">{locale === "en" ? p.category.parent.nameEn : p.category.parent.nameFr}</Link></>}
        {p.category && <> / <Link href={`/categorie/${p.category.slug}`} className="hover:underline">{locale === "en" ? p.category.nameEn : p.category.nameFr}</Link></>}
      </div>
      <div className="container-x grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <Gallery images={p.images} video={p.videoUrl} title={p.title} />
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {p.type === "DIGITAL" && <span className="badge bg-night-100 text-night-800 dark:bg-night-800 dark:text-night-100">{m.product.digital}</span>}
            {p.type === "SERVICE" && <span className="badge bg-night-100 text-night-800 dark:bg-night-800 dark:text-night-100">{m.product.service}</span>}
            {p.reviews.length > 0 && <span className="inline-flex items-center gap-1 font-semibold"><Star className="h-3.5 w-3.5 fill-gold-400 text-gold-400" />{avg.toFixed(1)} ({p.reviews.length})</span>}
            <span className="muted">{tx("Réf.", "Ref.")} {ref}</span>
          </div>
          <div className="mt-2 flex items-start justify-between gap-3"><h1 className="text-2xl font-extrabold leading-tight sm:text-3xl">{p.title}</h1><FavoriteButton productId={p.id} initial={isFav} label={m.nav.favorites} /></div>
          <div className="mt-3"><Price p={p} currency={p.currency} locale={locale} size="lg" /></div>
          {isPromoActive(p) && p.promoEndsAt && (
            <div className="mt-2 flex items-center gap-2 text-sm"><Clock className="h-4 w-4 text-brand-500" />{m.product.endsIn} <Countdown to={p.promoEndsAt} /></div>
          )}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1 muted"><MapPin className="h-4 w-4" />{p.shop.city?.name ?? ""}{p.shop.city ? ", " : ""}{locale === "en" ? p.shop.country.nameEn : p.shop.country.nameFr} {p.shop.country.flag}</span>
            <span className={`inline-flex items-center gap-1 font-medium ${p.stock === 0 || p.status !== "ACTIVE" ? "text-red-600" : lowStock ? "text-brand-600" : "text-wa-600"}`}>
              <Package className="h-4 w-4" />
              {p.status !== "ACTIVE" ? m.product.unavailable : p.stock === 0 ? m.product.outOfStock : lowStock ? interpolate(m.product.lowStock, { n: p.stock! }) : m.product.inStock}
            </span>
          </div>

          <div className="card mt-5 p-4 sm:p-5">
            <BuyBox
              product={{ id: p.id, slug: p.slug, title: p.title, currency: p.currency, unitPrice: unit, stock: p.stock, image: p.images[0]?.url, ref, url, available: p.status === "ACTIVE" }}
              variants={p.variants.map((v) => ({ id: v.id, name: v.name, price: v.price, stock: v.stock }))}
              shop={{ id: p.shopId, name: p.shop.name, whatsapp: p.shop.whatsapp }}
              labels={{ addToCart: m.product.addToCart, order: m.product.order, orderWhatsApp: m.product.orderWhatsApp, variant: m.product.variant, quantity: m.product.quantity, outOfStock: m.product.outOfStock, added: tx("Ajouté au panier ✓", "Added to cart ✓"), chooseVariant: tx("Choisissez une variante.", "Please choose a variant.") }}
              locale={locale}
            />
          </div>

          <Link href={`/boutique/${p.shop.slug}`} className="card mt-4 flex items-center gap-3 p-4 transition hover:shadow-lift">
            {p.shop.logoUrl && <Image src={p.shop.logoUrl} alt="" width={48} height={48} className="h-12 w-12 rounded-xl object-cover" />}
            <div className="min-w-0 flex-1">
              <p className="text-xs muted">{m.product.seller}</p>
              <p className="flex items-center gap-1 truncate font-bold">{p.shop.name}{p.shop.verification === "VERIFIED" && <span className="badge bg-night-100 text-night-700 dark:bg-night-800 dark:text-night-100"><BadgeCheck className="h-3 w-3" />{m.product.verified}</span>}</p>
              {p.shop.whatsapp && <p className="text-xs muted">{formatPhoneInternational(p.shop.whatsapp)}</p>}
            </div>
            <span className="text-sm font-semibold text-brand-600">{m.product.visitShop}</span>
          </Link>

          {p.shop.deliveryOptions.length > 0 && (
            <div className="mt-4 rounded-2xl bg-[rgb(var(--surface-2))] p-4 text-sm">
              <p className="mb-2 flex items-center gap-2 font-semibold"><Truck className="h-4 w-4" />{m.product.delivery}</p>
              <ul className="space-y-1">
                {p.shop.deliveryOptions.map((d) => (
                  <li key={d.id} className="flex justify-between gap-3"><span>{d.name}{d.delayLabel ? <span className="muted"> · {d.delayLabel}</span> : null}</span>
                    <span className="font-medium">{d.feeOnQuote ? tx("Sur devis", "On quote") : d.fee === 0 ? tx("Gratuit", "Free") : formatPrice(d.fee, p.currency, locale)}</span></li>
                ))}
              </ul>
              {p.shop.deliveryPolicy && <p className="mt-2 text-xs muted">{p.shop.deliveryPolicy}</p>}
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <ShareBar url={url} text={`${p.title} — ${formatPrice(unit, p.currency, locale)}`} label={m.product.share} />
            <Link href={`/signaler?product=${p.id}`} className="inline-flex items-center gap-1 text-xs muted hover:text-red-600"><Flag className="h-3.5 w-3.5" />{m.product.report}</Link>
          </div>
        </div>
      </div>

      <div className="container-x mt-10 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <section className="card p-5 sm:p-6">
          <h2 className="mb-3 text-lg font-bold">{m.product.description}</h2>
          <div className="prose-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: richText(p.description || "—") }} />
        </section>
        <section className="card p-5 sm:p-6">
          <h2 className="mb-3 text-lg font-bold">{m.product.reviews}</h2>
          {p.reviews.length === 0 ? (
            <p className="text-sm muted">{tx("Aucun avis pour l'instant. Seuls les clients ayant reçu leur commande peuvent laisser un avis.", "No reviews yet. Only customers who received their order can leave a review.")}</p>
          ) : (
            <ul className="space-y-4">{p.reviews.map((r) => (
              <li key={r.id} className="border-b border-[rgb(var(--border))] pb-3 last:border-0">
                <div className="flex items-center gap-2 text-sm"><span className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-gold-400 text-gold-400" : "text-[rgb(var(--border))]"}`} />)}</span><span className="font-semibold">{r.authorName}</span><span className="text-xs muted">· {tx("achat vérifié", "verified purchase")}</span></div>
                {r.comment && <p className="mt-1 text-sm">{r.comment}</p>}
              </li>
            ))}</ul>
          )}
        </section>
      </div>

      {similar.length > 0 && (
        <section className="container-x mt-10"><h2 className="mb-4 text-xl font-extrabold">{m.product.similar}</h2><ProductRow items={similar} locale={locale} /></section>
      )}
    </SiteShell>
  );
}
