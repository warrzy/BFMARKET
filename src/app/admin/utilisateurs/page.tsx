import type { Prisma, Role } from "@prisma/client";
import { db } from "@/server/db";
import { countryScope, requireAdmin } from "@/server/auth/guards";
import { PageTitle } from "@/components/dashboard/DashShell";
import { setUserRoleAction, suspendUserAction } from "@/app/actions/admin";

const ROLES: Role[] = ["BUYER", "SELLER", "AGENT", "COUNTRY_ADMIN", "ADMIN", "SUPER_ADMIN"];

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string; role?: string }> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const cs = countryScope(admin);
  const where: Prisma.UserWhereInput = {
    deletedAt: null, ...(cs ? { countryCode: cs } : {}),
    ...(ROLES.includes(sp.role as Role) ? { role: sp.role as Role } : {}),
    ...(sp.q ? { OR: [{ name: { contains: sp.q, mode: "insensitive" } }, { email: { contains: sp.q.toLowerCase() } }, { phone: { contains: sp.q.replace(/\s/g, "") } }] } : {}),
  };
  const users = await db.user.findMany({ where, orderBy: { createdAt: "desc" }, take: 100, include: { _count: { select: { shops: true, orders: true } } } });
  const isSuper = admin.role === "SUPER_ADMIN";
  return (
    <>
      <PageTitle title="Utilisateurs & rôles" subtitle="Seul un super administrateur peut modifier les rôles. Les administrateurs locaux sont limités à leurs pays." />
      <form className="mb-4 flex flex-wrap gap-2"><input name="q" defaultValue={sp.q} placeholder="Nom, e-mail, téléphone" className="input max-w-xs" />
        <select name="role" defaultValue={sp.role ?? ""} className="input w-auto"><option value="">Tous rôles</option>{ROLES.map((r) => <option key={r}>{r}</option>)}</select><button className="btn-dark">Filtrer</button></form>
      <div className="card overflow-x-auto">
        <table className="table-x min-w-[760px]">
          <thead><tr><th>Utilisateur</th><th>Pays</th><th>Activité</th><th>Rôle</th><th></th></tr></thead>
          <tbody>{users.map((u) => (
            <tr key={u.id}>
              <td><span className="font-medium">{u.name}</span>{u.suspendedAt && <span className="badge ml-1 bg-red-100 text-red-700">suspendu</span>}<div className="text-xs muted">{u.email ?? u.phone} · {u.verifiedAt ? "vérifié" : "non vérifié"}</div></td>
              <td>{u.countryCode ?? "—"}</td>
              <td className="text-xs">{u._count.shops} boutique(s) · {u._count.orders} commande(s)</td>
              <td>{isSuper && u.id !== admin.id ? (
                <form action={setUserRoleAction} className="flex gap-1"><input type="hidden" name="id" value={u.id} />
                  <select name="role" defaultValue={u.role} className="input w-36 py-1 text-xs">{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
                  <input name="countries" defaultValue={u.adminCountries.join(",")} placeholder="BF,CI" className="input w-20 py-1 text-xs" title="Pays (administrateur local)" />
                  <button className="btn-ghost px-2 py-1 text-xs">OK</button></form>
              ) : <span className="text-xs">{u.role}</span>}</td>
              <td>{u.id !== admin.id && admin.role !== "COUNTRY_ADMIN" && <form action={suspendUserAction}><input type="hidden" name="id" value={u.id} /><button className="text-xs font-semibold text-red-600">{u.suspendedAt ? "Réactiver" : "Suspendre"}</button></form>}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </>
  );
}
