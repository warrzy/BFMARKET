import Link from "next/link";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/guards";
import { PageTitle } from "@/components/dashboard/DashShell";
import { resolveReportAction } from "@/app/actions/admin";

export default async function AdminReports() {
  await requireAdmin();
  const [reports, disputes] = await Promise.all([
    db.report.findMany({ where: { status: { in: ["OPEN", "REVIEWING"] } }, orderBy: { createdAt: "asc" }, include: { shop: true } }),
    db.dispute.findMany({ where: { status: { in: ["OPEN", "REVIEWING"] } }, orderBy: { createdAt: "asc" }, include: { subOrder: { include: { shop: true } } } }),
  ]);
  const products = await db.product.findMany({ where: { id: { in: reports.map((r) => r.productId).filter(Boolean) as string[] } }, select: { id: true, title: true, slug: true } });
  const Actions = ({ id, kind }: { id: string; kind: "report" | "dispute" }) => (
    <form className="mt-2 flex flex-wrap gap-1"><input type="hidden" name="id" value={id} /><input type="hidden" name="kind" value={kind} />
      <input name="resolution" placeholder="Décision / commentaire" className="input w-60 py-1 text-xs" />
      <button formAction={resolveReportAction.bind(null, "REVIEWING")} className="btn-ghost px-2 py-1 text-xs">En cours</button>
      <button formAction={resolveReportAction.bind(null, "RESOLVED")} className="btn-primary px-2 py-1 text-xs">Résolu</button>
      <button formAction={resolveReportAction.bind(null, "DISMISSED")} className="btn-ghost px-2 py-1 text-xs">Classer</button></form>
  );
  return (
    <>
      <PageTitle title="Signalements & litiges" />
      <section className="mb-6"><h2 className="mb-3 font-bold">Signalements ({reports.length})</h2>
        <div className="space-y-3">{reports.map((r) => {
          const p = products.find((x) => x.id === r.productId);
          return (
            <div key={r.id} className="card p-4 text-sm">
              <p><b>{r.reason}</b> · {r.targetType === "product" && p ? <Link href={`/produit/${p.slug}`} target="_blank" className="underline">{p.title}</Link> : r.shop ? <Link href={`/boutique/${r.shop.slug}`} target="_blank" className="underline">{r.shop.name}</Link> : r.targetType} <span className="text-xs muted">· {r.createdAt.toLocaleString("fr-FR")} · {r.status}</span></p>
              {r.details && <p className="mt-1 muted">{r.details}</p>}
              <Actions id={r.id} kind="report" />
            </div>
          );
        })}{reports.length === 0 && <p className="card p-4 text-sm muted">Aucun signalement ouvert.</p>}</div>
      </section>
      <section><h2 className="mb-3 font-bold">Litiges ({disputes.length})</h2>
        <div className="space-y-3">{disputes.map((d) => (
          <div key={d.id} className="card p-4 text-sm"><p><b>{d.subOrder.reference}</b> · {d.subOrder.shop.name} · ouvert par {d.openedBy}</p><p className="muted">{d.reason}</p><Actions id={d.id} kind="dispute" /></div>
        ))}{disputes.length === 0 && <p className="card p-4 text-sm muted">Aucun litige ouvert.</p>}</div>
      </section>
    </>
  );
}
