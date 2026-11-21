import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Phone } from "lucide-react";
import { db } from "@/server/db";
import { requireShop } from "@/server/auth/guards";
import { PageTitle } from "@/components/dashboard/DashShell";
import { PaymentBadge, StatusBadge } from "@/components/dashboard/Badges";
import { WhatsAppIcon } from "@/components/layout/WhatsAppFab";
import { SUBORDER_TRANSITIONS, canChangePayment } from "@/server/modules/orders/state";
import { getProvider } from "@/server/modules/payments/registry";
import { sellerNoteAction, updateOrderStatusAction, updatePaymentAction } from "@/app/actions/seller";
import { formatPrice } from "@/lib/money";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { formatPhoneInternational } from "@/lib/phone";
import { waLink } from "@/lib/whatsapp";
import fr from "@/i18n/fr";

export default async function SellerOrder({ params }: { params: Promise<{ id: string }> }) {
  const { shop } = await requireShop();
  const s = await db.subOrder.findFirst({
    where: { id: (await params).id, shopId: shop.id },
    include: { order: true, items: { include: { product: { select: { slug: true } } } }, events: { orderBy: { createdAt: "desc" } }, transactions: { orderBy: { createdAt: "desc" } } },
  });
  if (!s) notFound();
  const next = SUBORDER_TRANSITIONS[s.status];
  const provider = getProvider(s.paymentMethod);
  const msg = `Bonjour ${s.order.buyerName}, ici ${shop.name}. Nous avons bien reçu votre commande ${s.reference} (${formatPrice(s.total, s.currency)}).`;
  return (
    <>
      <PageTitle title={`Commande ${s.reference}`} subtitle={s.createdAt.toLocaleString("fr-FR")}>
        <Link href="/vendeur/commandes" className="btn-ghost">Retour</Link>
      </PageTitle>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <div className="card">
            <div className="flex flex-wrap items-center gap-2 border-b border-[rgb(var(--border))] p-4"><StatusBadge s={s.status} /><PaymentBadge s={s.paymentStatus} /><span className="text-xs muted">Paiement : {provider?.label.fr ?? s.paymentMethod}</span></div>
            <ul className="divide-y divide-[rgb(var(--border))] px-4">{s.items.map((it) => (
              <li key={it.id} className="flex justify-between gap-3 py-3 text-sm"><span>{it.quantity} × {it.product ? <Link href={`/produit/${it.product.slug}`} className="hover:underline">{it.title}</Link> : it.title}{it.variantName ? <span className="muted"> ({it.variantName})</span> : null}</span><span className="font-medium">{formatPrice(it.total, s.currency)}</span></li>
            ))}</ul>
            <div className="space-y-1 border-t border-[rgb(var(--border))] p-4 text-sm">
              <p className="flex justify-between"><span>Sous-total</span><span>{formatPrice(s.itemsTotal, s.currency)}</span></p>
              {s.discount > 0 && <p className="flex justify-between"><span>Code {s.couponCode}</span><span>-{formatPrice(s.discount, s.currency)}</span></p>}
              <p className="flex justify-between"><span>Livraison{s.deliveryName ? ` (${s.deliveryName})` : ""}</span><span>{s.deliveryOnQuote ? "à communiquer au client" : formatPrice(s.deliveryFee, s.currency)}</span></p>
              <p className="flex justify-between text-base font-bold"><span>Total</span><span>{formatPrice(s.total, s.currency)}</span></p>
            </div>
          </div>

          <div className="card p-4">
            <h2 className="mb-3 font-bold">Mettre à jour le statut</h2>
            {next.length === 0 ? <p className="text-sm muted">Commande clôturée.</p> : (
              <form className="flex flex-wrap gap-2">
                <input type="hidden" name="id" value={s.id} />
                <input name="note" placeholder="Note (optionnelle, visible du client)" className="input min-w-48 flex-1" maxLength={300} />
                {next.map((st) => <SubmitButton key={st} formAction={updateOrderStatusAction.bind(null, st)} className={st === "CANCELLED" || st === "RETURNED" ? "btn-danger" : "btn-primary"}>{fr.status[st]}</SubmitButton>)}
              </form>
            )}
          </div>

          <div className="card p-4">
            <h2 className="mb-1 font-bold">Encaissement</h2>
            <p className="mb-3 text-sm muted">Validez uniquement quand l&apos;argent est réellement reçu. Chaque validation est tracée.</p>
            <form className="flex flex-wrap gap-2">
              <input type="hidden" name="id" value={s.id} />
              {canChangePayment("seller", s.paymentStatus, "PAID") && <SubmitButton formAction={updatePaymentAction.bind(null, "PAID")} className="btn-primary">Confirmer le paiement reçu</SubmitButton>}
              {canChangePayment("seller", s.paymentStatus, "UNPAID") && <SubmitButton formAction={updatePaymentAction.bind(null, "UNPAID")} className="btn-ghost">Déclaration non confirmée</SubmitButton>}
              {canChangePayment("seller", s.paymentStatus, "REFUNDED") && <SubmitButton formAction={updatePaymentAction.bind(null, "REFUNDED")} className="btn-ghost">Marquer remboursé</SubmitButton>}
            </form>
            {s.transactions.length > 0 && <ul className="mt-3 space-y-1 text-xs muted">{s.transactions.map((t) => <li key={t.id}>{t.createdAt.toLocaleString("fr-FR")} · {t.provider} · {t.status} · {formatPrice(t.amount, t.currency)}{t.validatedById ? " · validation manuelle" : ""}</li>)}</ul>}
          </div>

          <div className="card p-4">
            <h2 className="mb-3 font-bold">Historique</h2>
            <ul className="space-y-2 text-sm">{s.events.map((e) => <li key={e.id} className="flex gap-2"><span className="shrink-0 text-xs muted">{e.createdAt.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</span><span>{e.type === "payment" ? fr.payment[e.toValue as keyof typeof fr.payment] : fr.status[e.toValue as keyof typeof fr.status] ?? e.toValue}{e.note ? ` — ${e.note}` : ""}</span></li>)}</ul>
          </div>
        </div>
        <aside className="space-y-4">
          <div className="card space-y-2 p-4 text-sm">
            <h2 className="font-bold">Client</h2>
            <p className="font-medium">{s.order.buyerName}</p>
            <p className="flex items-center gap-2"><Phone className="h-4 w-4" />{formatPhoneInternational(s.order.buyerPhone)}</p>
            {s.order.buyerEmail && <p>{s.order.buyerEmail}</p>}
            <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /><span>{[s.order.neighborhood, s.order.city].filter(Boolean).join(", ")}{s.order.landmark && <><br /><span className="muted">Repère : {s.order.landmark}</span></>}</span></p>
            {s.order.note && <p className="rounded-lg bg-[rgb(var(--surface-2))] p-2">« {s.order.note} »</p>}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <a href={waLink(s.order.buyerPhone, msg)} target="_blank" rel="noopener noreferrer" className="btn-wa text-xs"><WhatsAppIcon className="h-4 w-4" />WhatsApp</a>
              <a href={`tel:${s.order.buyerPhone}`} className="btn-ghost text-xs">Appeler</a>
            </div>
          </div>
          <form action={sellerNoteAction} className="card space-y-2 p-4">
            <input type="hidden" name="id" value={s.id} />
            <label className="label" htmlFor="note">Note interne (non visible du client)</label>
            <textarea id="note" name="note" rows={3} defaultValue={s.sellerNote ?? ""} className="input" />
            <button className="btn-ghost w-full">Enregistrer la note</button>
          </form>
        </aside>
      </div>
    </>
  );
}
