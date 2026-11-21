import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/guards";
import { PageTitle } from "@/components/dashboard/DashShell";
import { addCityAction, toggleCityAction, toggleCountryAction } from "@/app/actions/admin";

export default async function AdminCountries() {
  const admin = await requireAdmin();
  const countries = await db.country.findMany({
    where: admin.role === "COUNTRY_ADMIN" ? { code: { in: admin.adminCountries } } : {},
    orderBy: { sortOrder: "asc" }, include: { cities: { orderBy: { name: "asc" } }, _count: { select: { shops: true } } },
  });
  return (
    <>
      <PageTitle title="Pays & villes" subtitle="Activez un pays pour l'ouvrir aux vendeurs et acheteurs. Les coordonnées GPS des villes permettent la suggestion « me localiser »." />
      <div className="space-y-3">
        {countries.map((c) => (
          <details key={c.code} className="card p-4">
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
              <span className="font-semibold">{c.flag} {c.nameFr} <span className="text-xs font-normal muted">+{c.dialCode} · {c.currency} · {c.cities.length} villes · {c._count.shops} boutiques</span></span>
              {admin.role === "SUPER_ADMIN" ? (
                <form action={toggleCountryAction}><input type="hidden" name="code" value={c.code} /><button className={`badge ${c.active ? "bg-wa-500 text-white" : "bg-[rgb(var(--surface-2))]"}`}>{c.active ? "Actif — désactiver" : "Inactif — activer"}</button></form>
              ) : <span className={`badge ${c.active ? "bg-wa-500 text-white" : "bg-[rgb(var(--surface-2))]"}`}>{c.active ? "Actif" : "Inactif"}</span>}
            </summary>
            <div className="mt-4">
              <div className="mb-3 flex flex-wrap gap-2">{c.cities.map((ci) => (
                <form key={ci.id} action={toggleCityAction}><input type="hidden" name="id" value={ci.id} /><button className={`chip ${ci.active ? "" : "line-through opacity-60"}`} title={ci.lat ? `${ci.lat}, ${ci.lng}` : "Sans coordonnées"}>{ci.name}</button></form>
              ))}</div>
              <form action={addCityAction} className="flex flex-wrap gap-2"><input type="hidden" name="countryCode" value={c.code} />
                <input name="name" required placeholder="Nouvelle ville" className="input w-48" /><input name="lat" placeholder="Latitude" className="input w-28" /><input name="lng" placeholder="Longitude" className="input w-28" />
                <button className="btn-dark">Ajouter</button></form>
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
