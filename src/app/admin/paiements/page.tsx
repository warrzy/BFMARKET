import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/guards";
import { PageTitle } from "@/components/dashboard/DashShell";
import { PROVIDERS } from "@/server/modules/payments/registry";
import { setProviderAction } from "@/app/actions/admin";
import { formatPrice } from "@/lib/money";

export default async function AdminPayments() {
  const admin = await requireAdmin();
  const isSuper = admin.role === "SUPER_ADMIN";
  const [configs, txs, webhooks] = await Promise.all([
    db.paymentProviderConfig.findMany({ include: { country: true }, orderBy: [{ country: { sortOrder: "asc" } }, { provider: "asc" }] }),
    db.transaction.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    db.webhookEvent.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
  ]);
  const byCountry = new Map<string, typeof configs>();
  configs.forEach((c) => byCountry.set(c.countryCode, [...(byCountry.get(c.countryCode) ?? []), c]));
  return (
    <>
      <PageTitle title="Paiements" subtitle="Activation des prestataires par pays. Les clés API restent dans les variables d'environnement du serveur, jamais en base." />
      <section className="card mb-6 p-5">
        <h2 className="mb-2 font-bold">Prestataires</h2>
        <ul className="mb-4 grid gap-2 text-sm sm:grid-cols-2">{Object.values(PROVIDERS).map((p) => (
          <li key={p.code} className="rounded-xl bg-[rgb(var(--surface-2))] p-3"><b>{p.label.fr}</b> <span className="text-xs muted">({p.code}, {p.kind === "online" ? "en ligne" : "hors ligne"})</span>
            <span className={`badge ml-2 ${p.isConfigured() ? "bg-wa-500/15 text-wa-600" : "bg-red-100 text-red-700"}`}>{p.isConfigured() ? "Configuré" : "Clés manquantes"}</span></li>
        ))}</ul>
        <div className="overflow-x-auto">
          <table className="table-x min-w-[720px]"><thead><tr><th>Pays</th>{Object.keys(PROVIDERS).map((k) => <th key={k}>{k}</th>)}</tr></thead>
            <tbody>{[...byCountry.entries()].map(([code, list]) => (
              <tr key={code}><td className="whitespace-nowrap">{list[0].country.flag} {list[0].country.nameFr}</td>
                {Object.keys(PROVIDERS).map((k) => {
                  const c = list.find((x) => x.provider === k);
                  if (!c) return <td key={k}>—</td>;
                  return <td key={k}>{isSuper ? (
                    <form action={setProviderAction} className="flex items-center gap-1"><input type="hidden" name="id" value={c.id} />
                      <input type="checkbox" name="enabled" defaultChecked={c.enabled} aria-label="Activé" />
                      {PROVIDERS[k].kind === "online" && <select name="mode" defaultValue={c.mode} className="input w-20 px-1 py-0.5 text-xs"><option value="test">test</option><option value="live">live</option></select>}
                      <button className="text-xs font-semibold text-brand-600">OK</button></form>
                  ) : (c.enabled ? "✓" : "—")}</td>;
                })}</tr>
            ))}</tbody></table>
        </div>
      </section>
      <section className="card mb-6 overflow-x-auto p-5">
        <h2 className="mb-3 font-bold">Transactions récentes (rapprochement)</h2>
        <table className="table-x min-w-[720px]"><thead><tr><th>Date</th><th>Objet</th><th>Prestataire</th><th>Montant</th><th>Statut</th><th>Réf. prestataire</th><th>Validation</th></tr></thead>
          <tbody>{txs.map((t) => (
            <tr key={t.id}><td className="text-xs">{t.createdAt.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</td><td>{t.purpose}</td><td>{t.provider}</td><td>{formatPrice(t.amount, t.currency)}</td>
              <td>{t.status}{t.failureReason && <div className="text-xs text-red-600">{t.failureReason}</div>}</td><td className="font-mono text-xs">{t.providerRef ?? "—"}</td><td className="text-xs">{t.validatedById ? "manuelle" : t.provider === "manual" ? "en attente" : "serveur"}</td></tr>
          ))}</tbody></table>
      </section>
      <section className="card overflow-x-auto p-5">
        <h2 className="mb-3 font-bold">Webhooks reçus</h2>
        <table className="table-x"><thead><tr><th>Date</th><th>Prestataire</th><th>Clé</th><th>Vérifié</th><th>Traité</th><th>Erreur</th></tr></thead>
          <tbody>{webhooks.map((w) => <tr key={w.id}><td className="text-xs">{w.createdAt.toLocaleString("fr-FR")}</td><td>{w.provider}</td><td className="font-mono text-xs">{w.eventKey.slice(0, 24)}</td><td>{w.verified ? "✓" : "—"}</td><td>{w.processedAt ? "✓" : "—"}</td><td className="text-xs text-red-600">{w.error}</td></tr>)}</tbody></table>
        {webhooks.length === 0 && <p className="py-3 text-center text-sm muted">Aucun webhook.</p>}
      </section>
    </>
  );
}
