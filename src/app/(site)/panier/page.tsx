import { getI18n } from "@/i18n";
import { getActiveCountries, getLocation } from "@/server/location";
import { getCurrentUser } from "@/server/auth/session";
import { SiteShell } from "@/components/layout/SiteShell";
import { CartView } from "@/components/cart/CartView";

export const metadata = { title: "Panier", robots: { index: false } };

export default async function CartPage() {
  const [{ m, locale }, countries, loc, user] = await Promise.all([getI18n(), getActiveCountries(), getLocation(), getCurrentUser()]);
  return (
    <SiteShell>
      <div className="container-x py-8">
        <h1 className="mb-6 text-3xl font-extrabold">{m.cart.title}</h1>
        <CartView
          locale={locale}
          countries={countries.map((c) => ({ code: c.code, name: locale === "en" ? c.nameEn : c.nameFr, flag: c.flag, cities: c.cities.map((x) => x.name) }))}
          defaultCountry={loc.country} defaultCity={loc.cityData?.name}
          user={user ? { name: user.name, phone: user.phone, email: user.email } : null}
        />
      </div>
    </SiteShell>
  );
}
