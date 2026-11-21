import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BadgeCheck, Flame, MapPin, Rocket, Share2, ShieldCheck, Sparkles, Star, Store, TrendingUp, Zap } from "lucide-react";
import { getI18n } from "@/i18n";
import { getLocation } from "@/server/location";
import { db } from "@/server/db";
import { activePromoWhere, listProducts, listShops } from "@/server/modules/catalog/queries";
import { SiteShell } from "@/components/layout/SiteShell";
import { Section } from "@/components/ui/Section";
import { ProductRow, ProductGrid } from "@/components/product/ProductCard";
import { ShopRow } from "@/components/shop/ShopCard";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { Countdown } from "@/components/ui/Countdown";
import { RecentlyViewed } from "@/components/product/RecentlyViewed";

export const revalidate = 60;

export default async function HomePage() {
  const { m, tx, locale } = await getI18n();
  const loc = await getLocation();
  const geo = { country: loc.country };
  const now = new Date();

  const [categories, flash, deals, newest, recommended, trending, verifiedShops, nearbyShops, bestDeals, countries, stats, reviews, banner] = await Promise.all([
    db.category.findMany({ where: { parentId: null, active: true }, orderBy: { sortOrder: "asc" } }),
    listProducts({ ...activePromoWhere(now), promoEndsAt: { not: null, gte: now } }, [{ promoEndsAt: "asc" }], 12, geo),
    listProducts(activePromoWhere(now), [{ updatedAt: "desc" }], 12, geo),
    listProducts({}, [{ createdAt: "desc" }], 12, geo),
    listProducts({ featured: true }, [{ viewCount: "desc" }], 12, geo),
    listProducts({}, [{ viewCount: "desc" }], 12, geo),
    listShops({ verification: "VERIFIED", ...(loc.country ? { countryCode: loc.country } : {}) }, 8),
    loc.cityId ? listShops({ cityId: loc.cityId }, 8) : loc.country ? listShops({ countryCode: loc.country }, 8) : Promise.resolve([]),
    listProducts(activePromoWhere(now), [{ promoPrice: "asc" }], 12, geo),
    db.country.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    Promise.all([
      db.shop.count({ where: { status: "ACTIVE" } }),
      db.product.count({ where: { status: "ACTIVE", deletedAt: null } }),
      db.country.count({ where: { active: true } }),
    ]),
    db.review.findMany({ where: { hidden: false, rating: { gte: 4 } }, orderBy: { createdAt: "desc" }, take: 6, include: { shop: { select: { name: true, slug: true } }, product: { select: { title: true } } } }),
    db.banner.findFirst({ where: { active: true, placement: "home_strip", OR: [{ countryCode: null }, { countryCode: loc.country ?? undefined }] }, orderBy: { sortOrder: "asc" } }),
  ]);

  const byCountry = await Promise.all(
    countries.slice(0, 4).map(async (c) => ({ c, items: await listProducts({}, [{ createdAt: "desc" }], 6, { country: c.code }) })),
  );
  const sellerPicks = await db.shop.findMany({
    where: { status: "ACTIVE", products: { some: { featured: true, status: "ACTIVE" } } }, take: 3, orderBy: { visitCount: "desc" },
    include: { city: true, country: true, products: { where: { status: "ACTIVE", deletedAt: null }, take: 3, orderBy: { featured: "desc" }, include: { images: { take: 1, orderBy: { position: "asc" } } } } },
  });
  const flashEnd = flash[0]?.promoEndsAt;

  return (
    <SiteShell>
      {/* HERO */}
      <section className="relative overflow-hidden bg-mesh text-white">
        <div className="pattern-kente absolute inset-0" aria-hidden />
        <div className="container-x relative grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.2fr_1fr]">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-gold-400" />{tx("0 % de commission pour les vendeurs", "0% commission for sellers")}
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl">
              {tx("Toute l'Afrique de l'Ouest,", "All of West Africa,")}{" "}
              <span className="bg-gradient-to-r from-brand-300 via-gold-400 to-brand-400 bg-clip-text text-transparent">{tx("un seul marché.", "one market.")}</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-night-100 sm:text-lg">{m.home.heroSubtitle}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/produits" className="btn-primary px-6 py-3.5 text-base">{m.home.explore}<ArrowRight className="h-5 w-5" /></Link>
              <Link href="/ouvrir-boutique" className="btn border border-white/30 bg-white/10 px-6 py-3.5 text-base text-white backdrop-blur hover:bg-white/20"><Store className="h-5 w-5" />{m.home.createShop}</Link>
            </div>
            <dl className="mt-10 grid max-w-lg grid-cols-4 gap-4 text-center sm:text-left">
              {[[stats[0], m.home.stats.shops], [stats[1], m.home.stats.products], [stats[2], m.home.stats.countries], ["0 %", m.home.stats.commission]].map(([v, l]) => (
                <div key={String(l)}><dt className="sr-only">{l}</dt><dd className="font-display text-2xl font-extrabold sm:text-3xl">{typeof v === "number" ? v.toLocaleString(locale) : v}</dd><p className="text-[11px] text-night-200 sm:text-xs">{l}</p></div>
              ))}
            </dl>
          </div>
          <div className="relative hidden lg:block" aria-hidden>
            <div className="grid grid-cols-2 gap-4">
              {(recommended.length ? recommended : newest).slice(0, 4).map((p, i) => (
                <div key={p.id} className={`overflow-hidden rounded-3xl border border-white/15 bg-white/10 p-2 shadow-2xl backdrop-blur ${i % 2 ? "translate-y-8" : ""}`}>
                  {p.images[0] && <Image src={p.images[0].url} alt="" width={260} height={260} className="aspect-square w-full rounded-2xl object-cover" />}
                  <p className="truncate px-1 pt-2 text-sm font-semibold">{p.title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {banner && (
        <div className="container-x -mt-6 relative z-10">
          <Link href={banner.href ?? "#"} className="card flex items-center gap-4 p-4 transition hover:shadow-lift">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-500 text-white"><Rocket className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1"><p className="font-bold">{locale === "en" ? banner.titleEn : banner.titleFr}</p><p className="truncate text-sm muted">{locale === "en" ? banner.subtitleEn : banner.subtitleFr}</p></div>
            <ArrowRight className="h-5 w-5 shrink-0 text-brand-500" />
          </Link>
        </div>
      )}

      {/* 1. Catégories */}
      <Section title={m.home.popularCategories} href="/categories" seeAll={m.home.seeAll}>
        <div className="scroll-row -mx-4 px-4 sm:mx-0 sm:grid sm:grid-cols-6 sm:overflow-visible sm:px-0 lg:grid-cols-11">
          {categories.map((c) => (
            <Link key={c.id} href={`/categorie/${c.slug}`} className="group flex w-20 shrink-0 snap-start flex-col items-center gap-2 text-center sm:w-auto">
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-[rgb(var(--surface))] shadow-card ring-1 ring-[rgb(var(--border))] transition group-hover:-translate-y-0.5 group-hover:bg-brand-500 group-hover:text-white">
                <CategoryIcon name={c.icon} className="h-7 w-7" />
              </span>
              <span className="line-clamp-2 text-[11.5px] font-medium leading-tight">{locale === "en" ? c.nameEn : c.nameFr}</span>
            </Link>
          ))}
        </div>
      </Section>

      {/* 2. Ventes flash */}
      {flash.length > 0 && (
        <section className="container-x mt-10 sm:mt-14">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-4 text-white sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-xl font-extrabold sm:text-2xl"><Zap className="h-6 w-6 fill-gold-400 text-gold-400" />{m.home.flashSales}</h2>
              <div className="flex items-center gap-3 text-sm">{flashEnd && <><span className="opacity-80">{tx("Prochaine fin", "Next ending")}</span><Countdown to={flashEnd} /></>}
                <Link href="/produits?tab=flash" className="font-semibold underline-offset-4 hover:underline">{m.home.seeAll}</Link></div>
            </div>
            <div className="[&_.card]:text-[rgb(var(--text))]"><ProductRow items={flash} locale={locale} /></div>
          </div>
        </section>
      )}

      {/* 3. Offres du jour */}
      {deals.length > 0 && <Section title={m.home.dealsOfDay} href="/produits?tab=promo" seeAll={m.home.seeAll} icon={<Flame className="h-6 w-6 text-brand-500" />}><ProductRow items={deals} locale={locale} /></Section>}

      {/* 4. Nouveaux produits */}
      <Section title={m.home.newArrivals} href="/produits?tab=new" seeAll={m.home.seeAll}>
        {newest.length ? <ProductRow items={newest} locale={locale} /> : <p className="muted">{m.common.noResults}</p>}
      </Section>

      {/* 5. Recommandés */}
      {recommended.length > 0 && <Section title={m.home.recommended} href="/produits" seeAll={m.home.seeAll} icon={<Sparkles className="h-6 w-6 text-gold-500" />}><ProductRow items={recommended} locale={locale} /></Section>}

      <RecentlyViewed title={tx("Vu récemment", "Recently viewed")} />

      {/* 6. Boutiques vérifiées */}
      {verifiedShops.length > 0 && <Section title={m.home.verifiedShops} href="/boutiques?verified=1" seeAll={m.home.seeAll} icon={<BadgeCheck className="h-6 w-6 text-night-500" />}><ShopRow items={verifiedShops} locale={locale} /></Section>}

      {/* 7. Boutiques proches */}
      <Section title={m.home.nearbyShops} href="/boutiques" seeAll={m.home.seeAll} icon={<MapPin className="h-6 w-6 text-brand-500" />}
        subtitle={loc.cityData ? `${loc.cityData.name}, ${loc.countryData?.flag}` : tx("Choisissez votre ville en haut de page pour voir les vendeurs proches.", "Pick your city at the top to see nearby sellers.")}>
        {nearbyShops.length ? <ShopRow items={nearbyShops} locale={locale} /> : <ShopRow items={await listShops({}, 8)} locale={locale} />}
      </Section>

      {/* 8. Tendance */}
      <Section title={m.home.trending} href="/produits?sort=popular" seeAll={m.home.seeAll} icon={<TrendingUp className="h-6 w-6 text-brand-500" />}>
        <ProductGrid items={trending.slice(0, 12)} locale={locale} />
      </Section>

      {/* 9. Meilleures offres */}
      {bestDeals.length > 0 && <Section title={m.home.bestDeals} href="/produits?tab=promo&sort=price_asc" seeAll={m.home.seeAll}><ProductRow items={bestDeals} locale={locale} /></Section>}

      {/* 10. Produits par pays */}
      <Section title={m.home.byCountry}>
        <div className="space-y-8">
          {byCountry.filter((x) => x.items.length).map(({ c, items }) => (
            <div key={c.code}>
              <div className="mb-3 flex items-center justify-between"><h3 className="text-lg font-bold">{c.flag} {locale === "en" ? c.nameEn : c.nameFr}</h3><Link href={`/produits?country=${c.code}`} className="text-sm font-semibold text-brand-600">{m.home.seeAll}</Link></div>
              <ProductRow items={items} locale={locale} />
            </div>
          ))}
        </div>
      </Section>

      {/* 11. Sélection de vendeurs */}
      {sellerPicks.length > 0 && (
        <Section title={m.home.sellerPicks}>
          <div className="grid gap-4 md:grid-cols-3">
            {sellerPicks.map((s) => (
              <Link key={s.id} href={`/boutique/${s.slug}`} className="card group p-4 transition hover:shadow-lift">
                <div className="flex items-center gap-3">
                  {s.logoUrl && <Image src={s.logoUrl} alt="" width={44} height={44} className="h-11 w-11 rounded-xl object-cover" />}
                  <div className="min-w-0"><p className="flex items-center gap-1 truncate font-bold">{s.name}{s.verification === "VERIFIED" && <BadgeCheck className="h-4 w-4 text-night-500" />}</p><p className="text-xs muted">{s.city?.name} {s.country.flag}</p></div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {s.products.map((p) => p.images[0] && <Image key={p.id} src={p.images[0].url} alt={p.title} width={120} height={120} className="aspect-square rounded-xl object-cover" />)}
                </div>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* 12. Entrepreneurs */}
      <Section title={m.home.entrepreneurs}>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: Store, t: tx("Une vitrine professionnelle", "A professional storefront"), d: tx("Logo, bannière, catalogue, horaires, WhatsApp : votre boutique a sa propre adresse à partager partout.", "Logo, banner, catalog, hours, WhatsApp: your shop gets its own link to share everywhere.") },
            { icon: Share2, t: tx("Vendez là où sont vos clients", "Sell where your customers are"), d: tx("Partagez vos produits sur WhatsApp, Facebook et TikTok avec un lien et un QR code.", "Share your products on WhatsApp, Facebook and TikTok with a link and a QR code.") },
            { icon: ShieldCheck, t: tx("Vous gardez 100 % de vos ventes", "You keep 100% of your sales"), d: tx("Aucune commission : un abonnement simple, et une offre gratuite pour commencer.", "No commission: a simple subscription, and a free plan to start.") },
          ].map((b) => (
            <div key={b.t} className="card p-6"><b.icon className="h-8 w-8 text-brand-500" /><h3 className="mt-4 text-lg font-bold">{b.t}</h3><p className="mt-2 text-sm leading-relaxed muted">{b.d}</p></div>
          ))}
        </div>
      </Section>

      {/* 13. Comment vendre */}
      <Section title={m.home.howToSell}>
        <div className="overflow-hidden rounded-3xl bg-night-900 p-6 text-white sm:p-10">
          <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [tx("Créez votre compte", "Create your account"), tx("Avec votre téléphone ou e-mail, en 1 minute.", "With your phone or email, in 1 minute.")],
              [tx("Personnalisez la boutique", "Customize your shop"), tx("Nom, ville, logo, WhatsApp.", "Name, city, logo, WhatsApp.")],
              [tx("Ajoutez vos produits", "Add your products"), tx("Photos depuis votre téléphone, prix, stock.", "Photos from your phone, price, stock.")],
              [tx("Partagez et vendez", "Share and sell"), tx("Recevez les commandes et livrez vos clients.", "Receive orders and deliver to your customers.")],
            ].map(([t, d], i) => (
              <li key={t} className="relative"><span className="font-display text-5xl font-extrabold text-brand-400/80">0{i + 1}</span><h3 className="mt-2 text-lg font-bold">{t}</h3><p className="mt-1 text-sm text-night-200">{d}</p></li>
            ))}
          </ol>
          <Link href="/ouvrir-boutique" className="btn-primary mt-8 px-6 py-3">{m.home.createShop}<ArrowRight className="h-4 w-4" /></Link>
        </div>
      </Section>

      {/* 14. Avis authentifiés */}
      <Section title={m.home.reviews} icon={<Star className="h-6 w-6 fill-gold-400 text-gold-400" />}>
        {reviews.length ? (
          <div className="grid gap-4 md:grid-cols-3">
            {reviews.map((r) => (
              <figure key={r.id} className="card p-5">
                <div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-gold-400 text-gold-400" : "text-[rgb(var(--border))]"}`} />)}</div>
                <blockquote className="mt-3 text-sm leading-relaxed">{r.comment}</blockquote>
                <figcaption className="mt-3 text-xs muted">{r.authorName} · {tx("achat vérifié", "verified purchase")} · <Link href={`/boutique/${r.shop.slug}`} className="underline">{r.shop.name}</Link></figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <p className="card p-6 text-sm muted">{m.home.noReviews}</p>
        )}
      </Section>
    </SiteShell>
  );
}
