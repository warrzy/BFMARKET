import { BadgeCheck, Clock, Trash2 } from "lucide-react";
import { db } from "@/server/db";
import { requireShop } from "@/server/auth/guards";
import { getShopEntitlements } from "@/server/modules/subscriptions/service";
import { PageTitle } from "@/components/dashboard/DashShell";
import { ShopSettingsForm } from "@/components/seller/ShopSettingsForm";
import { deleteDeliveryOptionAction, deleteSectionAction, requestVerificationAction, saveDeliveryOptionAction, saveSectionAction } from "@/app/actions/seller";
import { formatPrice } from "@/lib/money";

export default async function ShopSettings() {
  const { shop } = await requireShop("MANAGER");
  const [cities, ent, delivery, sections] = await Promise.all([
    db.city.findMany({ where: { countryCode: shop.countryCode, active: true }, orderBy: { name: "asc" } }),
    getShopEntitlements(shop.id),
    db.deliveryOption.findMany({ where: { shopId: shop.id }, orderBy: { name: "asc" } }),
    db.shopSection.findMany({ where: { shopId: shop.id }, orderBy: { position: "asc" }, include: { _count: { select: { products: true } } } }),
  ]);
  return (
    <>
      <PageTitle title="Ma boutique" subtitle={`/boutique/${shop.slug}`} />
      <div className="card mb-6 flex flex-wrap items-center gap-3 p-4">
        {shop.verification === "VERIFIED" ? <><BadgeCheck className="h-6 w-6 text-night-500" /><p className="flex-1 text-sm"><b>Boutique vérifiée</b> — le badge est affiché sur votre boutique et vos produits.</p></>
          : shop.verification === "PENDING" ? <><Clock className="h-6 w-6 text-gold-500" /><p className="flex-1 text-sm">Vérification en cours par l&apos;équipe ECOM MARKET.</p></>
          : <><BadgeCheck className="h-6 w-6 muted" /><p className="flex-1 text-sm">Obtenez le badge <b>Boutique vérifiée</b> : l&apos;équipe contrôle votre identité et votre activité.{shop.verification === "REJECTED" ? " (Demande précédente refusée — complétez votre profil.)" : ""}</p>
            <form action={requestVerificationAction}><button className="btn-dark">Demander la vérification</button></form></>}
      </div>
      <ShopSettingsForm shop={{ ...shop, openingHours: shop.openingHours as Record<string, string>, socials: shop.socials as Record<string, string> }} cities={cities} canCustomize={ent.features.customization} />

      <section className="card mt-6 p-5">
        <h2 className="mb-3 font-bold">Modes de livraison</h2>
        <ul className="mb-4 divide-y divide-[rgb(var(--border))]">{delivery.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-3 py-2 text-sm"><span>{d.name}{d.delayLabel ? <span className="muted"> · {d.delayLabel}</span> : null}</span>
            <span className="flex items-center gap-2"><b>{d.feeOnQuote ? "Sur devis" : formatPrice(d.fee, shop.country.currency)}</b><form action={deleteDeliveryOptionAction}><input type="hidden" name="id" value={d.id} /><button className="p-1 text-red-600" aria-label="Supprimer"><Trash2 className="h-4 w-4" /></button></form></span></li>
        ))}</ul>
        <form action={saveDeliveryOptionAction} className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_auto_auto] sm:items-center">
          <input name="name" required placeholder="Ex. Livraison Ouaga 2000" className="input" />
          <input name="fee" inputMode="numeric" placeholder={`Frais (${shop.country.currency})`} className="input" />
          <input name="delayLabel" placeholder="Délai" className="input" />
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="feeOnQuote" />Sur devis</label>
          <button className="btn-dark">Ajouter</button>
        </form>
      </section>

      <section className="card mt-6 p-5">
        <h2 className="mb-1 font-bold">Rayons (catégories internes)</h2>
        <p className="mb-3 text-sm muted">Organisez votre catalogue : « Nouveautés », « Femme », « Accessoires »…</p>
        <div className="mb-3 flex flex-wrap gap-2">{sections.map((s) => (
          <form key={s.id} action={deleteSectionAction} className="chip"><input type="hidden" name="id" value={s.id} />{s.name} <span className="muted">({s._count.products})</span><button aria-label="Supprimer" className="text-red-600"><Trash2 className="h-3.5 w-3.5" /></button></form>
        ))}</div>
        <form action={saveSectionAction} className="flex gap-2"><input name="name" required placeholder="Nom du rayon" className="input max-w-xs" /><button className="btn-dark">Ajouter</button></form>
      </section>
    </>
  );
}
