import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/guards";
import { PageTitle } from "@/components/dashboard/DashShell";
import { BannerForm } from "@/components/admin/Forms";
import { toggleBannerAction } from "@/app/actions/admin";

export default async function AdminContent() {
  await requireAdmin(["ADMIN", "SUPER_ADMIN"]);
  const [banners, countries] = await Promise.all([db.banner.findMany({ orderBy: { sortOrder: "asc" } }), db.country.findMany({ where: { active: true } })]);
  return (
    <>
      <PageTitle title="Contenus & bannières" />
      <section className="card mb-6 p-5"><h2 className="mb-3 font-bold">Nouvelle bannière</h2><BannerForm countries={countries.map((c) => ({ code: c.code, name: c.nameFr }))} /></section>
      <div className="card divide-y divide-[rgb(var(--border))]">
        {banners.map((b) => (
          <div key={b.id} className="flex items-center justify-between gap-3 p-4 text-sm">
            <div><b>{b.titleFr}</b> <span className="muted">· {b.placement} · {b.countryCode ?? "tous pays"} · {b.href}</span></div>
            <form action={toggleBannerAction}><input type="hidden" name="id" value={b.id} /><button className={`badge ${b.active ? "bg-wa-500 text-white" : "bg-[rgb(var(--surface-2))]"}`}>{b.active ? "Active" : "Inactive"}</button></form>
          </div>
        ))}
      </div>
    </>
  );
}
