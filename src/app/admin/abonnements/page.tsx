import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/guards";
import { PageTitle } from "@/components/dashboard/DashShell";
import { PlanForm, PlatformCouponForm } from "@/components/admin/Forms";
import { savePlanPriceAction, validateSubscriptionPaymentAction } from "@/app/actions/admin";
import { formatPrice } from "@/lib/money";

export default async function AdminSubscriptions() {
  const admin = await requireAdmin();
  const isSuper = admin.role === "SUPER_ADMIN";
  const [plans, countries, pending, coupons, recent] = await Promise.all([
    db.plan.findMany({ orderBy: { sortOrder: "asc" }, include: { prices: true } }),
    db.country.findMany({ orderBy: { sortOrder: "asc" } }),
    db.transaction.findMany({ where: { purpose: "subscription", status: "PENDING" }, orderBy: { createdAt: "asc" }, include: { subscription: { include: { plan: true, shop: { include: { country: true } } } } } }),
    db.coupon.findMany({ where: { shopId: null }, orderBy: { createdAt: "desc" } }),
    db.subscription.findMany({ where: { current: true, plan: { code: { not: "FREE" } } }, orderBy: { currentPeriodEnd: "asc" }, take: 50, include: { plan: true, shop: true } }),
  ]);
  return (
    <>
      <PageTitle title="Abonnements" subtitle="Tarifs configurables par pays et devise. Aucun tarif n'est figé dans le code." />
      <section className="card mb-6 p-5">
        <h2 className="mb-3 font-bold">Paiements d&apos;abonnement à valider ({pending.length})</h2>
        {pending.length === 0 ? <p className="text-sm muted">Aucun paiement en attente.</p> : (
          <ul className="divide-y divide-[rgb(var(--border))]">{pending.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <span><b>{t.subscription?.shop.name}</b> {t.subscription?.shop.country.flag} — {t.subscription?.plan.nameFr} ({t.subscription?.interval}) — <b>{formatPrice(t.amount, t.currency)}</b> — réf. <span className="font-mono">{t.id.slice(-8).toUpperCase()}</span></span>
              <form className="flex flex-wrap gap-1"><input type="hidden" name="id" value={t.id} />
                <input name="providerRef" placeholder="ID transaction Mobile Money" className="input w-48 py-1 text-xs" />
                <button formAction={validateSubscriptionPaymentAction.bind(null, "approve")} className="btn-primary px-3 py-1 text-xs">Valider</button>
                <button formAction={validateSubscriptionPaymentAction.bind(null, "reject")} className="btn-ghost px-3 py-1 text-xs">Rejeter</button></form>
            </li>
          ))}</ul>
        )}
      </section>
      <section className="mb-6 grid gap-4 lg:grid-cols-3">
        {plans.map((p) => (
          <div key={p.id} className="card p-5">
            <h2 className="mb-3 text-lg font-bold">{p.code}</h2>
            {isSuper ? <PlanForm plan={{ ...p, features: p.features as Record<string, unknown> }} /> : <pre className="text-xs">{JSON.stringify(p.features, null, 1)}</pre>}
          </div>
        ))}
      </section>
      <section className="card mb-6 overflow-x-auto p-5">
        <h2 className="mb-3 font-bold">Tarifs par pays</h2>
        <table className="table-x min-w-[720px]"><thead><tr><th>Pays</th>{plans.map((p) => <th key={p.id}>{p.code} (mensuel / annuel)</th>)}</tr></thead>
          <tbody>{countries.map((c) => (
            <tr key={c.code}><td className="whitespace-nowrap">{c.flag} {c.nameFr} <span className="text-xs muted">{c.currency}</span></td>
              {plans.map((p) => {
                const pr = p.prices.find((x) => x.countryCode === c.code);
                return <td key={p.id}>{isSuper ? (
                  <form action={savePlanPriceAction} className="flex gap-1"><input type="hidden" name="planId" value={p.id} /><input type="hidden" name="countryCode" value={c.code} /><input type="hidden" name="currency" value={pr?.currency ?? c.currency} />
                    <input name="monthly" defaultValue={pr?.monthly ?? ""} placeholder="—" className="input w-20 px-2 py-1 text-xs" aria-label="Mensuel" /><input name="yearly" defaultValue={pr?.yearly ?? ""} placeholder="—" className="input w-24 px-2 py-1 text-xs" aria-label="Annuel" />
                    <button className="btn-ghost px-2 py-1 text-xs">OK</button></form>
                ) : pr ? `${formatPrice(pr.monthly, pr.currency)} / ${formatPrice(pr.yearly, pr.currency)}` : "—"}</td>;
              })}</tr>
          ))}</tbody></table>
      </section>
      <section className="card mb-6 p-5">
        <h2 className="mb-3 font-bold">Coupons d&apos;abonnement</h2>
        {isSuper && <PlatformCouponForm />}
        <ul className="mt-3 flex flex-wrap gap-2 text-sm">{coupons.map((c) => <li key={c.id} className="chip"><b className="font-mono">{c.code}</b> -{c.percentOff}% · {c.usedCount}{c.maxUses ? `/${c.maxUses}` : ""}</li>)}</ul>
      </section>
      <section className="card overflow-x-auto p-5">
        <h2 className="mb-3 font-bold">Abonnements payants en cours</h2>
        <table className="table-x"><thead><tr><th>Boutique</th><th>Offre</th><th>Statut</th><th>Échéance</th></tr></thead>
          <tbody>{recent.map((s) => <tr key={s.id}><td>{s.shop.name}</td><td>{s.plan.code}</td><td>{s.status}</td><td>{s.currentPeriodEnd?.toLocaleDateString("fr-FR") ?? "—"}</td></tr>)}</tbody></table>
      </section>
    </>
  );
}
