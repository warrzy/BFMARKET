import { Check, X } from "lucide-react";
import { db } from "@/server/db";
import { requireShop } from "@/server/auth/guards";
import { getShopEntitlements } from "@/server/modules/subscriptions/service";
import { parseFeatures } from "@/server/modules/subscriptions/entitlements";
import { PageTitle } from "@/components/dashboard/DashShell";
import { SubscribeForm } from "@/components/seller/Forms";
import { formatPrice } from "@/lib/money";

const FEATURES: [keyof ReturnType<typeof parseFeatures>, string][] = [
  ["promotions", "Promotions et codes promo"], ["advancedStats", "Statistiques avancées"], ["customization", "Thèmes premium"],
  ["ai", "Assistant IA illimité"], ["import", "Import CSV / Excel"], ["advancedStock", "Gestion avancée des stocks"],
  ["featured", "Visibilité renforcée"], ["prioritySupport", "Assistance prioritaire"],
];

export default async function Subscription() {
  const { shop } = await requireShop("OWNER");
  const [ent, plans, history, pending] = await Promise.all([
    getShopEntitlements(shop.id),
    db.plan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, include: { prices: { where: { countryCode: shop.countryCode } } } }),
    db.subscription.findMany({ where: { shopId: shop.id }, orderBy: { createdAt: "desc" }, take: 20, include: { plan: true, transactions: true } }),
    db.transaction.findMany({ where: { subscription: { shopId: shop.id }, status: "PENDING" }, include: { subscription: { include: { plan: true } } } }),
  ]);
  const sub = ent.subscription;
  const support = (await db.setting.findUnique({ where: { key: "platform.supportWhatsapp" } }))?.value as string | undefined;
  return (
    <>
      <PageTitle title="Abonnement" subtitle={`Offre actuelle : ${ent.planCode}${sub?.status === "TRIALING" ? " (essai)" : ""}${sub?.currentPeriodEnd ? ` · jusqu'au ${sub.currentPeriodEnd.toLocaleDateString("fr-FR")}` : ""}`} />
      {pending.length > 0 && (
        <div className="card mb-6 border-gold-500 p-4 text-sm">
          <p className="font-bold">Paiement en attente de validation</p>
          {pending.map((t) => <p key={t.id}>{t.subscription?.plan.nameFr} — {formatPrice(t.amount, t.currency)} — réf. <b className="font-mono">{t.id.slice(-8).toUpperCase()}</b></p>)}
          <p className="mt-1 muted">Réglez par Mobile Money auprès d&apos;ECOM MARKET en indiquant la référence{support ? ` (WhatsApp support : +${support.replace(/^\+/, "")})` : ""}. L&apos;offre est activée après vérification.</p>
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((p) => {
          const f = parseFeatures(p.features);
          const price = p.prices[0];
          const current = ent.planCode === p.code;
          return (
            <div key={p.id} className={`card flex flex-col p-5 ${p.code === "PRO" ? "ring-2 ring-brand-500" : ""}`}>
              {p.code === "PRO" && <span className="badge mb-2 w-fit bg-brand-500 text-white">Le plus choisi</span>}
              <h2 className="text-xl font-extrabold">{p.nameFr}</h2>
              <p className="text-sm muted">{p.descriptionFr}</p>
              <p className="mt-3 font-display text-3xl font-extrabold">{price ? (price.monthly === 0 ? "Gratuit" : formatPrice(price.monthly, price.currency)) : "—"}<span className="text-sm font-normal muted">{price && price.monthly > 0 ? " / mois" : ""}</span></p>
              {price && price.yearly > 0 && <p className="text-xs muted">ou {formatPrice(price.yearly, price.currency)} / an</p>}
              {p.trialDays > 0 && <p className="mt-1 text-xs font-semibold text-wa-600">{p.trialDays} jours d&apos;essai gratuit</p>}
              <ul className="my-4 flex-1 space-y-1.5 text-sm">
                <li className="flex gap-2"><Check className="h-4 w-4 text-wa-600" />{f.maxProducts == null ? "Produits illimités (usage raisonnable)" : `Jusqu'à ${f.maxProducts} produits`}</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-wa-600" />Commandes, WhatsApp, URL personnalisée</li>
                {f.staffAccounts > 0 && <li className="flex gap-2"><Check className="h-4 w-4 text-wa-600" />{f.staffAccounts} compte(s) collaborateur</li>}
                {FEATURES.map(([k, l]) => <li key={k} className={`flex gap-2 ${f[k] ? "" : "muted line-through"}`}>{f[k] ? <Check className="h-4 w-4 text-wa-600" /> : <X className="h-4 w-4" />}{l}</li>)}
              </ul>
              {price ? (p.code !== "FREE" && <SubscribeForm plan={p.code} label={current ? "Renouveler" : p.trialDays ? "Essayer" : "Choisir"} />) : <p className="text-xs muted">Tarif non encore disponible dans votre pays.</p>}
            </div>
          );
        })}
      </div>
      <section className="card mt-6 overflow-x-auto p-5">
        <h2 className="mb-3 font-bold">Historique</h2>
        <table className="table-x min-w-[520px]"><thead><tr><th>Date</th><th>Offre</th><th>Période</th><th>Montant</th><th>Statut</th></tr></thead>
          <tbody>{history.map((h) => (
            <tr key={h.id}><td className="text-xs">{h.createdAt.toLocaleDateString("fr-FR")}</td><td>{h.plan.nameFr} {h.current && <span className="badge bg-wa-500/15 text-wa-600">actuelle</span>}</td>
              <td className="text-xs">{h.interval === "yearly" ? "Annuel" : "Mensuel"}{h.currentPeriodEnd ? ` → ${h.currentPeriodEnd.toLocaleDateString("fr-FR")}` : ""}</td>
              <td>{formatPrice(h.amount, h.currency)}</td><td className="text-xs">{h.transactions.some((t) => t.status === "PENDING") ? "En attente de paiement" : h.status}</td></tr>
          ))}</tbody></table>
      </section>
    </>
  );
}
