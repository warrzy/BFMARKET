import Link from "next/link";
import { requireShop } from "@/server/auth/guards";
import { getShopEntitlements } from "@/server/modules/subscriptions/service";
import { IMPORT_COLUMNS } from "@/server/modules/catalog/import";
import { PageTitle } from "@/components/dashboard/DashShell";
import { ImportForm } from "@/components/seller/Forms";

export default async function ImportPage() {
  const { shop } = await requireShop("MANAGER");
  const ent = await getShopEntitlements(shop.id);
  return (
    <>
      <PageTitle title="Import / export du catalogue" />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-2 font-bold">Exporter mon catalogue</h2>
          <p className="mb-4 text-sm muted">Téléchargez tous vos produits (disponible pour toutes les offres).</p>
          <div className="flex gap-2"><a href="/api/vendeur/export?format=csv" className="btn-dark">CSV</a><a href="/api/vendeur/export?format=xlsx" className="btn-ghost">Excel (.xlsx)</a></div>
        </section>
        <section className="card p-5">
          <h2 className="mb-2 font-bold">Importer des produits</h2>
          {ent.features.import ? (
            <>
              <p className="mb-2 text-sm muted">Colonnes attendues (la première ligne contient les en-têtes) :</p>
              <p className="mb-3 rounded-lg bg-[rgb(var(--surface-2))] p-2 font-mono text-xs">{IMPORT_COLUMNS.join(", ")}</p>
              <p className="mb-3 text-xs muted">Les produits sont créés en brouillon pour vérification. Astuce : exportez votre catalogue pour obtenir un modèle.</p>
              <ImportForm />
            </>
          ) : <p className="text-sm">L&apos;import est inclus dans l&apos;offre Business. <Link href="/vendeur/abonnement" className="font-semibold text-brand-600">Voir les offres</Link></p>}
        </section>
      </div>
    </>
  );
}
