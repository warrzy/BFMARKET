import Link from "next/link";
import { getI18n } from "@/i18n";
import { Logo } from "@/components/ui/Logo";
import { db } from "@/server/db";

export async function Footer() {
  const { m, tx, locale } = await getI18n();
  const countries = await db.country.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  const cols = [
    { title: m.footer.marketplace, links: [["/produits", m.nav.products], ["/boutiques", m.nav.shops], ["/categories", m.nav.categories], ["/produits?tab=flash", tx("Ventes flash", "Flash sales")], ["/produits?tab=promo", tx("Promotions", "Deals")]] },
    { title: m.footer.sellers, links: [["/vendre", tx("Vendre sur ECOM MARKET", "Sell on ECOM MARKET")], ["/ouvrir-boutique", m.nav.openShop], ["/tarifs", tx("Offres et tarifs", "Plans & pricing")], ["/vendeur", tx("Espace vendeur", "Seller dashboard")], ["/agences", tx("Agences partenaires", "Partner agencies")]] },
    { title: m.footer.company, links: [["/a-propos", tx("À propos", "About")], ["/aide", m.nav.help], ["/confidentialite", m.footer.privacy], ["/conditions", m.footer.terms], ["/mentions-legales", m.footer.legal]] },
  ];
  return (
    <footer className="mt-16 bg-night-950 pb-24 text-night-100 sm:pb-0">
      <div className="pattern-kente">
        <div className="container-x grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Logo light />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-night-200">{m.footer.about}</p>
            <div className="mt-5 flex flex-wrap gap-1.5 text-lg" aria-label={tx("Pays actifs", "Active countries")}>
              {countries.map((c) => <span key={c.code} title={locale === "en" ? c.nameEn : c.nameFr}>{c.flag}</span>)}
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-white">{c.title}</h3>
              <ul className="space-y-2 text-sm text-night-200">
                {c.links.map(([href, label]) => <li key={href}><Link href={href} className="hover:text-brand-300">{label}</Link></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10">
          <div className="container-x flex flex-col items-center justify-between gap-2 py-5 text-xs text-night-300 sm:flex-row">
            <p>© {new Date().getFullYear()} ECOM MARKET. {m.footer.rights}</p>
            <p>{tx("Paiements sécurisés · 0 % de commission vendeur", "Secure payments · 0% seller commission")}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
