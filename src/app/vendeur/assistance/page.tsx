import Link from "next/link";
import { db } from "@/server/db";
import { requireShop } from "@/server/auth/guards";
import { getShopEntitlements } from "@/server/modules/subscriptions/service";
import { PageTitle } from "@/components/dashboard/DashShell";
import { TicketForm } from "@/components/seller/Forms";
import { waLink } from "@/lib/whatsapp";

export default async function Support() {
  const { shop } = await requireShop();
  const [ent, support] = await Promise.all([getShopEntitlements(shop.id), db.setting.findUnique({ where: { key: "platform.supportWhatsapp" } })]);
  const wa = support?.value as string | undefined;
  return (
    <>
      <PageTitle title="Assistance" subtitle={ent.features.prioritySupport ? "Vous bénéficiez de l'assistance prioritaire." : undefined} />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5"><h2 className="mb-3 font-bold">Écrire à l&apos;équipe</h2><TicketForm /></section>
        <section className="card space-y-3 p-5 text-sm">
          <h2 className="font-bold">Aide rapide</h2>
          {wa && <a href={waLink(wa.startsWith("+") ? wa : `+${wa}`, `Bonjour, je suis le vendeur ${shop.name} (${shop.slug}).`)} target="_blank" rel="noopener noreferrer" className="btn-wa w-full">Support WhatsApp</a>}
          <ul className="list-inside list-disc space-y-1 muted">
            <li><Link href="/aide" className="underline">Centre d&apos;aide</Link> : créer un produit, partager sa boutique, gérer les commandes.</li>
            <li>Photos : lumière naturelle, fond uni, produit centré.</li>
            <li>Répondez vite aux commandes : c&apos;est le premier facteur de vente.</li>
          </ul>
        </section>
      </div>
    </>
  );
}
