import Link from "next/link";
import { Heart, Home, LayoutGrid, Search, Store, User } from "lucide-react";
import { getI18n } from "@/i18n";
import { getCurrentUser } from "@/server/auth/session";
import { isAdmin } from "@/server/auth/guards";
import { getActiveCountries, getLocation } from "@/server/location";
import { db } from "@/server/db";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LocationPicker } from "./LocationPicker";
import { CartButton, LangSwitch } from "./HeaderClient";

export async function Header({ q = "" }: { q?: string }) {
  const [{ m, locale, tx }, user, loc, countries] = await Promise.all([getI18n(), getCurrentUser(), getLocation(), getActiveCountries()]);
  const hasShop = user ? (await db.shopMember.count({ where: { userId: user.id } })) > 0 : false;
  const label = loc.cityData?.name ?? (loc.countryData ? (locale === "en" ? loc.countryData.nameEn : loc.countryData.nameFr) : m.nav.allCountries);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[rgb(var(--border))] bg-[rgb(var(--surface))]/90 backdrop-blur-xl">
        <div className="container-x flex h-16 items-center gap-2 sm:gap-4">
          <Logo />
          <form action="/produits" className="relative mx-2 hidden flex-1 md:block" role="search">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 muted" />
            <input name="q" defaultValue={q} placeholder={m.nav.search} className="input rounded-full bg-[rgb(var(--surface-2))] pl-10" aria-label={m.nav.search} />
          </form>
          <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
            <div className="hidden sm:block">
              <LocationPicker
                countries={countries.map((c) => ({ code: c.code, name: locale === "en" ? c.nameEn : c.nameFr, flag: c.flag, cities: c.cities.map((ci) => ({ id: ci.id, name: ci.name })) }))}
                current={{ country: loc.country, cityId: loc.cityId, label }}
                labels={{ allCountries: m.nav.allCountries, allCities: m.nav.allCities, deliverFrom: m.nav.deliverFrom, apply: m.common.apply, locate: tx("Me localiser (avec mon accord)", "Locate me (with my consent)"), title: tx("Où êtes-vous ?", "Where are you?") }}
              />
            </div>
            <LangSwitch locale={locale} />
            <ThemeToggle label={m.nav.theme} />
            <Link href="/favoris" aria-label={m.nav.favorites} className="hidden h-10 w-10 place-items-center rounded-xl hover:bg-[rgb(var(--surface-2))] sm:grid"><Heart className="h-5 w-5" /></Link>
            <CartButton label={m.nav.cart} />
            {user ? (
              <Link href={isAdmin(user) ? "/admin" : hasShop ? "/vendeur" : "/compte"} className="hidden h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold hover:bg-[rgb(var(--surface-2))] sm:flex">
                <User className="h-4 w-4" />{isAdmin(user) ? m.nav.admin : hasShop ? m.nav.myShop : m.nav.account}
              </Link>
            ) : (
              <Link href="/connexion" className="hidden h-10 items-center rounded-xl px-3 text-sm font-semibold hover:bg-[rgb(var(--surface-2))] sm:flex">{m.nav.login}</Link>
            )}
            {!hasShop && (
              <Link href="/ouvrir-boutique" className="btn-primary ml-1 hidden lg:inline-flex"><Store className="h-4 w-4" />{m.nav.openShop}</Link>
            )}
          </div>
        </div>
        <div className="container-x flex items-center gap-2 pb-3 md:hidden">
          <form action="/produits" className="relative flex-1" role="search">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 muted" />
            <input name="q" defaultValue={q} placeholder={m.nav.search} className="input rounded-full bg-[rgb(var(--surface-2))] py-2 pl-10" aria-label={m.nav.search} />
          </form>
          <div className="sm:hidden">
            <LocationPicker
              countries={countries.map((c) => ({ code: c.code, name: locale === "en" ? c.nameEn : c.nameFr, flag: c.flag, cities: c.cities.map((ci) => ({ id: ci.id, name: ci.name })) }))}
              current={{ country: loc.country, cityId: loc.cityId, label: loc.cityData?.name ?? loc.countryData?.flag ?? "🌍" }}
              labels={{ allCountries: m.nav.allCountries, allCities: m.nav.allCities, deliverFrom: m.nav.deliverFrom, apply: m.common.apply, locate: tx("Me localiser (avec mon accord)", "Locate me (with my consent)"), title: tx("Où êtes-vous ?", "Where are you?") }}
            />
          </div>
        </div>
      </header>

      {/* Navigation basse mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[rgb(var(--border))] bg-[rgb(var(--surface))]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:hidden" aria-label="Navigation principale">
        <div className="grid grid-cols-5 text-[10.5px] font-medium">
          {[
            { href: "/", icon: Home, label: m.nav.home },
            { href: "/categories", icon: LayoutGrid, label: m.nav.categories },
            { href: hasShop ? "/vendeur" : "/ouvrir-boutique", icon: Store, label: hasShop ? m.nav.myShop : m.nav.sell, accent: true },
            { href: "/favoris", icon: Heart, label: m.nav.favorites },
            { href: user ? (isAdmin(user) ? "/admin" : "/compte") : "/connexion", icon: User, label: user ? m.nav.account : m.nav.login },
          ].map((it) => (
            <Link key={it.label} href={it.href} className="relative flex flex-col items-center gap-0.5 py-2">
              <span className={it.accent ? "-mt-5 grid h-11 w-11 place-items-center rounded-2xl bg-brand-500 text-white shadow-lg shadow-brand-500/40" : ""}>
                <it.icon className="h-5 w-5" />
              </span>
              {it.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
