import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/guards";
import { PageTitle } from "@/components/dashboard/DashShell";

export default async function AuditLogPage({ searchParams }: { searchParams: Promise<{ action?: string }> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const logs = await db.auditLog.findMany({
    where: { ...(sp.action ? { action: { startsWith: sp.action } } : {}), ...(admin.role === "COUNTRY_ADMIN" ? { countryCode: { in: admin.adminCountries } } : {}) },
    orderBy: { createdAt: "desc" }, take: 200, include: { actor: { select: { name: true, role: true } } },
  });
  return (
    <>
      <PageTitle title="Journal d'audit" subtitle="Toutes les opérations sensibles (validation de paiement, modération, rôles, vérifications…)." />
      <form className="mb-4 flex gap-2"><input name="action" defaultValue={sp.action} placeholder="Filtrer par action (ex. payment, shop.)" className="input max-w-xs" /><button className="btn-dark">Filtrer</button></form>
      <div className="card overflow-x-auto">
        <table className="table-x min-w-[760px]"><thead><tr><th>Date</th><th>Acteur</th><th>Action</th><th>Cible</th><th>Détails</th><th>IP</th></tr></thead>
          <tbody>{logs.map((l) => (
            <tr key={l.id}><td className="whitespace-nowrap text-xs">{l.createdAt.toLocaleString("fr-FR")}</td><td className="text-xs">{l.actor ? `${l.actor.name} (${l.actor.role})` : "système"}</td>
              <td className="font-mono text-xs">{l.action}</td><td className="text-xs">{l.targetType}:{l.targetId?.slice(-8)}{l.countryCode ? ` · ${l.countryCode}` : ""}</td>
              <td className="max-w-xs truncate font-mono text-[11px] muted">{JSON.stringify(l.metadata)}</td><td className="text-xs muted">{l.ip}</td></tr>
          ))}</tbody></table>
      </div>
    </>
  );
}
