import { db } from "@/server/db";
import { requireShop } from "@/server/auth/guards";
import { shopFinancials } from "@/server/modules/orders/service";
import { availableProviders } from "@/server/modules/payments/registry";
import { PageTitle, Stat } from "@/components/dashboard/DashShell";
import { formatPrice } from "@/lib/money";

export default async function Payments() {
  const { shop } = await requireShop("MANAGER");
  const cur = shop.country.currency;
  const [fin, txs, providers] = await Promise.all([
    shopFinancials(shop.id),
    db.transaction.findMany({ where: { subOrder: { shopId: shop.id } }, orderBy: { createdAt: "desc" }, take: 100, include: { subOrder: { select: { reference: true } } } }),
    availableProviders(shop.countryCode),
  ]);
  return (
    <>
      <PageTitle title="Paiements" subtitle="ECOM MARKET ne prélève aucune commission et ne détient pas vos fonds : vos clients vous paient directement." />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Commandes enregistrées" value={formatPrice(fin.ordersValue, cur)} hint={`${fin.ordersCount} commande(s) — montant non garanti`} accent="night" />
        <Stat label="Réellement encaissé" value={formatPrice(fin.paidValue, cur)} hint="Confirmé par vous ou par un prestataire" accent="green" />
        <Stat label="Déclaré par les clients" value={formatPrice(fin.declaredValue, cur)} hint="À vérifier avant de confirmer" accent="gold" />
      </div>
      <section className="card mt-6 p-5">
        <h2 className="mb-2 font-bold">Modes de paiement proposés dans votre pays</h2>
        <ul className="flex flex-wrap gap-2">{providers.map(({ provider }) => <li key={provider.code} className="chip">{provider.label.fr}</li>)}</ul>
        <p className="mt-2 text-xs muted">Les paiements en ligne (Mobile Money, carte) sont activés pays par pays par l&apos;administration lorsque le contrat avec le prestataire est en place.</p>
      </section>
      <section className="card mt-6 overflow-x-auto p-5">
        <h2 className="mb-3 font-bold">Historique des transactions</h2>
        <table className="table-x min-w-[560px]"><thead><tr><th>Date</th><th>Commande</th><th>Mode</th><th>Montant</th><th>Statut</th><th>Origine</th></tr></thead>
          <tbody>{txs.map((t) => (
            <tr key={t.id}><td className="text-xs">{t.createdAt.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</td><td>{t.subOrder?.reference}</td><td>{t.provider}</td>
              <td>{formatPrice(t.amount, t.currency)}</td><td>{t.status}</td><td className="text-xs">{t.validatedById ? "Validation manuelle" : "Prestataire (vérifié serveur)"}</td></tr>
          ))}</tbody></table>
        {txs.length === 0 && <p className="py-4 text-center text-sm muted">Aucune transaction.</p>}
      </section>
    </>
  );
}
