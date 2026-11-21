import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { COUNTRIES } from "./data/geo";
import { CATEGORIES } from "./data/categories";

const db = new PrismaClient();
const slug = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const ACTIVE_AT_LAUNCH = ["BF"];
const DEMO = process.env.SEED_DEMO ? process.env.SEED_DEMO === "true" : process.env.NODE_ENV !== "production";

async function seedGeo() {
  for (const c of COUNTRIES) {
    const { cities, ...country } = c;
    await db.country.upsert({
      where: { code: c.code },
      // `active` n'est jamais écrasé lors d'un nouveau seed : c'est un choix de l'administration.
      update: { nameFr: country.nameFr, nameEn: country.nameEn, flag: country.flag, dialCode: country.dialCode, currency: country.currency, sortOrder: country.sortOrder },
      create: { ...country, active: ACTIVE_AT_LAUNCH.includes(c.code) || (DEMO && ["CI", "SN"].includes(c.code)) },
    });
    for (const name of cities) {
      await db.city.upsert({ where: { countryCode_slug: { countryCode: c.code, slug: slug(name) } }, update: {}, create: { name, slug: slug(name), countryCode: c.code } });
    }
  }
}

async function seedCategories() {
  let order = 0;
  for (const c of CATEGORIES) {
    const parent = await db.category.upsert({
      where: { slug: c.slug },
      update: { nameFr: c.nameFr, nameEn: c.nameEn, icon: c.icon, attributes: c.attributes ?? [] },
      create: { slug: c.slug, nameFr: c.nameFr, nameEn: c.nameEn, icon: c.icon, attributes: c.attributes ?? [], sortOrder: order++ },
    });
    let j = 0;
    for (const [s, fr, en] of c.children ?? []) {
      await db.category.upsert({ where: { slug: s }, update: { parentId: parent.id }, create: { slug: s, nameFr: fr, nameEn: en, parentId: parent.id, icon: c.icon, sortOrder: j++ } });
    }
  }
}

async function seedPlans() {
  const plans = [
    { code: "FREE", nameFr: "Gratuit", nameEn: "Free", sortOrder: 0, trialDays: 0,
      descriptionFr: "Pour démarrer et tester la vente en ligne.", descriptionEn: "To get started selling online.",
      features: { maxProducts: 15, promotions: false, advancedStats: false, customization: false, staffAccounts: 0, import: false, ai: false, featured: false, prioritySupport: false, advancedStock: false } },
    { code: "PRO", nameFr: "Pro", nameEn: "Pro", sortOrder: 1, trialDays: 14,
      descriptionFr: "Pour les commerçants actifs qui veulent vendre plus.", descriptionEn: "For active merchants who want to sell more.",
      features: { maxProducts: 300, promotions: true, advancedStats: true, customization: true, staffAccounts: 1, import: false, ai: true, featured: false, prioritySupport: true, advancedStock: false } },
    { code: "BUSINESS", nameFr: "Business", nameEn: "Business", sortOrder: 2, trialDays: 14,
      descriptionFr: "Pour les entreprises et grands catalogues.", descriptionEn: "For companies and large catalogs.",
      features: { maxProducts: null, promotions: true, advancedStats: true, customization: true, staffAccounts: 5, import: true, ai: true, featured: true, prioritySupport: true, advancedStock: true } },
  ];
  for (const p of plans) {
    await db.plan.upsert({ where: { code: p.code }, update: {}, create: p });
  }
  // ⚠️ Tarifs de DÉMONSTRATION, à remplacer dans Administration > Abonnements.
  // Seuls les pays en XOF reçoivent un tarif par défaut ; les autres devises sont à saisir par l'admin.
  const demoXof: Record<string, [number, number]> = { FREE: [0, 0], PRO: [5000, 50000], BUSINESS: [15000, 150000] };
  const allPlans = await db.plan.findMany();
  for (const c of COUNTRIES.filter((c) => c.currency === "XOF")) {
    for (const plan of allPlans) {
      const [monthly, yearly] = demoXof[plan.code] ?? [0, 0];
      await db.planPrice.upsert({
        where: { planId_countryCode: { planId: plan.id, countryCode: c.code } },
        update: {},
        create: { planId: plan.id, countryCode: c.code, currency: "XOF", monthly, yearly },
      });
    }
  }
}

async function seedPayments() {
  for (const c of COUNTRIES) {
    for (const provider of ["direct", "cod", "manual"]) {
      await db.paymentProviderConfig.upsert({
        where: { provider_countryCode: { provider, countryCode: c.code } },
        update: {},
        create: { provider, countryCode: c.code, enabled: true, mode: "live" },
      });
    }
    for (const provider of ["cinetpay", "paydunya"]) {
      await db.paymentProviderConfig.upsert({
        where: { provider_countryCode: { provider, countryCode: c.code } },
        update: {},
        create: { provider, countryCode: c.code, enabled: false, mode: "test" },
      });
    }
  }
}

async function seedSettings() {
  const defaults: Record<string, unknown> = {
    "platform.name": "ECOM MARKET",
    "platform.supportWhatsapp": process.env.SUPPORT_WHATSAPP ?? "",
    "catalog.moderation": "post", // post = publication immédiate puis modération ; pre = validation avant publication
    "orders.commissionPercent": 0,
  };
  for (const [key, value] of Object.entries(defaults)) {
    await db.setting.upsert({ where: { key }, update: {}, create: { key, value: value as never } });
  }
}

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@ecommarket.local";
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return;
  const password = process.env.SEED_ADMIN_PASSWORD ?? randomBytes(9).toString("base64url");
  await db.user.create({
    data: { email, name: "Super administrateur", role: "SUPER_ADMIN", passwordHash: await bcrypt.hash(password, 12), verifiedAt: new Date() },
  });
  console.log(`\n  ➜ Super admin créé : ${email}${process.env.SEED_ADMIN_PASSWORD ? "" : `  /  mot de passe : ${password}  (à changer)`}\n`);
}

// ───────────── Données de démonstration (désactivées en production) ─────────────

const PALETTES = [["#F25412", "#781F10"], ["#363F96", "#11132F"], ["#1DA851", "#0B4D2B"], ["#E9A90C", "#8A4B00"], ["#BC2A09", "#2D337A"], ["#0E7490", "#11132F"]];

async function demoImage(file: string, label: string, sub: string, i: number, w = 900, h = 900) {
  const [a, b] = PALETTES[i % PALETTES.length];
  const esc = (s: string) => s.replace(/[<>&"]/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <circle cx="${w * 0.82}" cy="${h * 0.18}" r="${w * 0.32}" fill="#fff" opacity=".08"/>
    <circle cx="${w * 0.1}" cy="${h * 0.95}" r="${w * 0.4}" fill="#000" opacity=".12"/>
    <path d="M0 ${h * 0.72} Q ${w / 2} ${h * 0.6} ${w} ${h * 0.75} L ${w} ${h} L 0 ${h} Z" fill="#fff" opacity=".07"/>
    <text x="50%" y="48%" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-size="${Math.round(w / 12)}" font-weight="700" fill="#fff">${esc(label)}</text>
    <text x="50%" y="58%" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-size="${Math.round(w / 30)}" fill="#fff" opacity=".8">${esc(sub)}</text>
  </svg>`;
  const out = path.join(process.cwd(), "public", "uploads", "demo", file);
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, await sharp(Buffer.from(svg)).webp({ quality: 80 }).toBuffer());
  return `/uploads/demo/${file}`;
}

const DEMO_SHOPS = [
  { name: "Faso Couture Atelier", country: "BF", city: "ouagadougou", sector: "Mode", verified: true, plan: "PRO", accent: "#E33B08",
    tagline: "Tenues sur mesure en Faso Dan Fani", products: [
      ["Ensemble Faso Dan Fani homme", "tenues-traditionnelles", 25000, 21000, 8], ["Robe wax cintrée", "mode-femme", 18000, null, 12],
      ["Chemise pagne manches courtes", "mode-homme", 9500, null, 20], ["Pagne tissé 3 mètres", "faso-dan-fani", 12000, 10500, 30],
      ["Boubou brodé cérémonie", "tenues-traditionnelles", 45000, null, 3], ["Sac en pagne tissé", "faso-dan-fani", 7500, null, 15] ] },
  { name: "Ouaga Tech Store", country: "BF", city: "ouagadougou", sector: "Téléphones", verified: true, plan: "BUSINESS", accent: "#363F96",
    tagline: "Smartphones et accessoires garantis", products: [
      ["Smartphone 128 Go double SIM", "smartphones", 89000, 79000, 6], ["Écouteurs sans fil", "accessoires-telephone", 12000, 9900, 25],
      ["Batterie externe 20 000 mAh", "accessoires-telephone", 15000, null, 18], ["Ordinateur portable 15 pouces", "ordinateurs", 285000, null, 2],
      ["Chargeur rapide 33 W", "accessoires-telephone", 6500, null, 40], ["Montre connectée sport", "bijoux-montres", 22000, 18500, 9] ] },
  { name: "Soleil du Sahel Énergie", country: "BF", city: "bobo-dioulasso", sector: "Énergie solaire", verified: false, plan: "FREE", accent: "#E9A90C",
    tagline: "Kits solaires pour maisons et boutiques", products: [
      ["Kit solaire 300 W complet", "energie-solaire", 175000, 159000, 4], ["Panneau solaire 150 W", "energie-solaire", 55000, null, 10],
      ["Lampe solaire rechargeable", "energie-solaire", 7000, null, 50], ["Batterie gel 100 Ah", "energie-solaire", 95000, null, 5] ] },
  { name: "Karité Beauté Naturelle", country: "BF", city: "koudougou", sector: "Beauté", verified: true, plan: "PRO", accent: "#1DA851",
    tagline: "Beurre de karité pur et soins naturels", products: [
      ["Beurre de karité pur 500 g", "soins-peau", 3500, null, 100], ["Savon noir artisanal", "soins-peau", 1500, 1200, 80],
      ["Huile de baobab 100 ml", "soins-peau", 4500, null, 35], ["Coffret soins naturels", "soins-peau", 15000, 12500, 12] ] },
  { name: "Saveurs du Faso", country: "BF", city: "ouagadougou", sector: "Alimentation", verified: false, plan: "FREE", accent: "#BC2A09",
    tagline: "Produits locaux livrés chez vous", products: [
      ["Miel pur du Burkina 1 L", "produits-locaux", 6000, null, 40], ["Soumbala traditionnel", "produits-locaux", 1000, null, 60],
      ["Jus de bissap 1,5 L", "boissons", 1500, null, 30], ["Riz local étuvé 25 kg", "produits-locaux", 17500, 16000, 20] ] },
  { name: "Abidjan Maison Déco", country: "CI", city: "abidjan", sector: "Maison", verified: true, plan: "PRO", accent: "#0E7490",
    tagline: "Décoration moderne aux accents africains", products: [
      ["Coussin wax 45 cm", "maison-decoration", 8000, 6500, 25], ["Lampe en rotin tressé", "maison-decoration", 22000, null, 7],
      ["Canapé 3 places", "mobilier", 350000, null, 2], ["Vase en terre cuite", "vannerie-poterie", 9000, null, 14] ] },
  { name: "Dakar Sneakers", country: "SN", city: "dakar", sector: "Chaussures", verified: false, plan: "FREE", accent: "#2D337A",
    tagline: "Baskets et sandales pour tous", products: [
      ["Baskets montantes cuir", "chaussures", 35000, 29000, 10], ["Sandales en cuir artisanal", "chaussures", 12000, null, 22],
      ["Mocassins homme", "chaussures", 27000, null, 6] ] },
];

async function seedDemo() {
  const pw = await bcrypt.hash(process.env.SEED_DEMO_PASSWORD ?? "demo-vendeur-2026", 12);
  const plans = Object.fromEntries((await db.plan.findMany()).map((p) => [p.code, p]));
  let imgIndex = 0;
  for (const [si, s] of DEMO_SHOPS.entries()) {
    const shopSlug = slug(s.name);
    if (await db.shop.findUnique({ where: { slug: shopSlug } })) continue;
    const city = await db.city.findUnique({ where: { countryCode_slug: { countryCode: s.country, slug: s.city } } });
    const country = COUNTRIES.find((c) => c.code === s.country)!;
    const phone = `+${country.dialCode}${s.country === "BF" ? "7000000" : s.country === "CI" ? "070000000" : "77000000"}${si}`;
    const user = await db.user.create({
      data: { email: `demo+${shopSlug}@ecommarket.local`, name: `Démo ${s.name}`, role: "SELLER", passwordHash: pw, verifiedAt: new Date(), countryCode: s.country },
    });
    const shop = await db.shop.create({
      data: {
        slug: shopSlug, name: s.name, tagline: s.tagline, sector: s.sector, countryCode: s.country, cityId: city?.id,
        description: `Boutique de démonstration ECOM MARKET.\n${s.tagline}. Les données de cette boutique sont fictives et servent à illustrer la plateforme.`,
        whatsapp: phone, phone, status: "ACTIVE", verification: s.verified ? "VERIFIED" : "NONE", verifiedAt: s.verified ? new Date() : null,
        accentColor: s.accent, onboardingStep: 6,
        logoUrl: await demoImage(`${shopSlug}-logo.webp`, s.name.split(" ").map((w) => w[0]).join("").slice(0, 3), "", si, 400, 400),
        coverUrl: await demoImage(`${shopSlug}-cover.webp`, s.name, s.tagline, si + 1, 1600, 600),
        deliveryPolicy: "Livraison en ville sous 24 à 48 h. Frais selon le quartier.", returnPolicy: "Échange possible sous 3 jours si l'article n'a pas été porté ou utilisé.",
        openingHours: { lun_ven: "08:00–19:00", sam: "09:00–17:00", dim: "Fermé" },
        members: { create: { userId: user.id, role: "OWNER" } },
        deliveryOptions: { create: [
          { name: `Livraison ${city?.name ?? ""}`.trim(), fee: country.currency === "XOF" ? 1000 : 0, delayLabel: "24–48 h" },
          { name: "Retrait en boutique", fee: 0, delayLabel: "Le jour même" },
          { name: "Expédition autre ville", fee: 0, feeOnQuote: true, delayLabel: "2–5 jours" },
        ] },
        subscriptions: { create: { planId: plans[s.plan].id, status: "ACTIVE", currency: country.currency, amount: 0, currentPeriodEnd: s.plan === "FREE" ? null : new Date(Date.now() + 30 * 86400_000) } },
      },
    });
    for (const [pi, [title, cat, price, promo, stock]] of s.products.entries()) {
      const category = await db.category.findUnique({ where: { slug: cat as string } });
      const imgs = [];
      for (let k = 0; k < 2; k++) imgs.push({ url: await demoImage(`${shopSlug}-${pi}-${k}.webp`, (title as string).split(" ").slice(0, 2).join(" "), s.name, imgIndex++), position: k, alt: title as string });
      const flash = promo && pi % 2 === 0;
      await db.product.create({
        data: {
          shopId: shop.id, categoryId: category?.id, slug: `${slug(title as string)}-${shop.id.slice(-5)}`, title: title as string,
          description: `**${title}**\nArticle de démonstration proposé par ${s.name}.\nContactez le vendeur pour plus de détails.`,
          currency: country.currency, price: price as number, promoPrice: promo as number | null,
          promoEndsAt: flash ? new Date(Date.now() + (2 + pi) * 86400_000) : null,
          stock: stock as number, featured: pi === 0, tags: (title as string).toLowerCase().split(" ").filter((w) => w.length > 3),
          images: { create: imgs },
          ...(cat === "mode-femme" || cat === "mode-homme" ? { variants: { create: ["M", "L", "XL"].map((t) => ({ name: t, options: { taille: t }, stock: 4 })) } } : {}),
        },
      });
    }
  }
  console.log(`  ➜ Démo : ${DEMO_SHOPS.length} boutiques (mot de passe vendeur : ${process.env.SEED_DEMO_PASSWORD ? "SEED_DEMO_PASSWORD" : "demo-vendeur-2026"})`);
}

async function main() {
  await seedGeo();
  await seedCategories();
  await seedPlans();
  await seedPayments();
  await seedSettings();
  await seedAdmin();
  if (DEMO) await seedDemo();
  await db.banner.upsert({
    where: { id: "welcome" }, update: {},
    create: { id: "welcome", titleFr: "Ouvrez votre boutique en 5 minutes", titleEn: "Open your shop in 5 minutes", subtitleFr: "Zéro commission sur vos ventes.", subtitleEn: "Zero commission on your sales.", href: "/ouvrir-boutique", placement: "home_strip" },
  });
  console.log("Seed terminé.");
}

main().finally(() => db.$disconnect());
