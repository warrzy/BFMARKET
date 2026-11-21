import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/guards";
import { PageTitle } from "@/components/dashboard/DashShell";
import { closeTicketAction } from "@/app/actions/admin";

export default async function AdminSupport() {
  await requireAdmin();
  const tickets = await db.supportTicket.findMany({ orderBy: [{ status: "desc" }, { createdAt: "desc" }], take: 100 });
  return (
    <>
      <PageTitle title="Support client" />
      <div className="space-y-3">{tickets.map((t) => (
        <div key={t.id} className={`card p-4 text-sm ${t.status === "closed" ? "opacity-60" : ""}`}>
          <div className="flex justify-between gap-2"><b>{t.subject}</b><span className="text-xs muted">{t.createdAt.toLocaleString("fr-FR")}</span></div>
          <p className="text-xs muted">{t.name} · {t.contact}</p>
          <p className="mt-2 whitespace-pre-line">{t.message}</p>
          {t.status !== "closed" && <form action={closeTicketAction} className="mt-2"><input type="hidden" name="id" value={t.id} /><button className="btn-ghost px-3 py-1 text-xs">Clore</button></form>}
        </div>
      ))}{tickets.length === 0 && <p className="card p-6 text-center text-sm muted">Aucune demande.</p>}</div>
    </>
  );
}
