import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, CircleDot, CreditCard, Star } from "lucide-react";
import { db } from "@/server/db";
import { getI18n } from "@/i18n";
import { SiteShell } from "@/components/layout/SiteShell";
import { WhatsAppIcon } from "@/components/layout/WhatsAppFab";
import { formatPrice } from "@/lib/money";
import { waLink } from "@/lib/whatsapp";
import { getProvider } from "@/server/modules/payments/registry";
import { declarePaymentAction, payOnlineAction, submitReviewAction } from "@/app/actions/order-public";

export const metadata = { title: "Suivi de commande", robots: { index: false } };

const FLOW = ["PENDING", "CONFIRMED", "PREPARING", "SHIPPED", "DELIVERED"] as const;

export default async function TrackingPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ nouvelle?: string }> }) {
  const { token } = await params;
  const isNew = (await searchParams).nouvelle === "1";
  const order = await db.order.findUnique({
    where: { trackingToken: token },
    include: { subOrders: { include: { shop: true, items: true, events: { orderBy: { createdAt: "asc" } }, review: true }, orderBy: { reference: "asc" } } },
  });
  if (!order) notFound();
  const { m, tx, locale } = await getI18n();

  return (
    <SiteShell>
      <div className="container-x max-w-3xl py-8">
        {isNew && (
          <div className="card mb-6 flex items-start gap-3 border-wa-500/40 bg-wa-500/5 p-5">
            <CheckCircle2 className="h-7 w-7 shrink-0 text-wa-600" />
            <div><p className="text-lg font-bold">{tx("Commande envoyée !", "Order sent!")}</p>
              <p className="text-sm muted">{tx("Les vendeurs vont vous contacter pour confirmer. Conservez ce lien pour suivre votre commande.", "Sellers will contact you to confirm. Keep this link to track your order.")}</p></div>
          </div>
        )}
        <h1 className="text-2xl font-extrabold">{tx("Commande", "Order")} {order.reference}</h1>
        <p className="mt-1 text-sm muted">{order.createdAt.toLocaleString(locale === "en" ? "en-GB" : "fr-FR")} · {order.city}{order.neighborhood ? `, ${order.neighborhood}` : ""}</p>

        <div className="mt-6 space-y-5">
          {order.subOrders.map((s) => {
            const provider = getProvider(s.paymentMethod);
            const step = FLOW.indexOf(s.status as (typeof FLOW)[number]);
            const waMsg = `${tx("Bonjour", "Hello")} ${s.shop.name}, ${tx("je vous contacte au sujet de ma commande", "about my order")} ${s.reference} (${formatPrice(s.total, s.currency, locale)}).`;
            return (
              <section key={s.id} className="card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] px-4 py-3">
                  <div><p className="font-bold">{s.shop.name}</p><p className="text-xs muted">{s.reference}</p></div>
                  <div className="flex gap-2 text-xs">
                    <span className="badge bg-night-900 text-white dark:bg-white dark:text-night-900">{m.status[s.status]}</span>
                    <span className={`badge ${s.paymentStatus === "PAID" ? "bg-wa-500 text-white" : "bg-gold-400/30 text-night-900 dark:text-gold-400"}`}>{m.payment[s.paymentStatus]}</span>
                  </div>
                </div>
                {s.status !== "CANCELLED" && s.status !== "RETURNED" && (
                  <ol className="flex gap-1 px-4 pt-4">
                    {FLOW.map((f, i) => (
                      <li key={f} className="flex-1">
                        <div className={`h-1.5 rounded-full ${i <= step ? "bg-brand-500" : "bg-[rgb(var(--surface-2))]"}`} />
                        <p className={`mt-1 hidden text-[11px] sm:block ${i <= step ? "font-semibold" : "muted"}`}>{m.status[f]}</p>
                      </li>
                    ))}
                  </ol>
                )}
                <ul className="divide-y divide-[rgb(var(--border))] px-4">
                  {s.items.map((it) => (
                    <li key={it.id} className="flex justify-between gap-3 py-3 text-sm">
                      <span>{it.quantity} × {it.title}{it.variantName ? ` (${it.variantName})` : ""}</span>
                      <span className="font-medium">{formatPrice(it.total, s.currency, locale)}</span>
                    </li>
                  ))}
                </ul>
                <div className="space-y-1 border-t border-[rgb(var(--border))] px-4 py-3 text-sm">
                  {s.discount > 0 && <p className="flex justify-between"><span>{tx("Réduction", "Discount")} ({s.couponCode})</span><span>-{formatPrice(s.discount, s.currency, locale)}</span></p>}
                  <p className="flex justify-between"><span>{tx("Livraison", "Delivery")}{s.deliveryName ? ` · ${s.deliveryName}` : ""}</span><span>{s.deliveryOnQuote ? tx("sur devis", "on quote") : formatPrice(s.deliveryFee, s.currency, locale)}</span></p>
                  <p className="flex justify-between text-base font-bold"><span>Total</span><span>{formatPrice(s.total, s.currency, locale)}</span></p>
                  <p className="text-xs muted">{tx("Paiement", "Payment")} : {provider ? provider.label[locale === "en" ? "en" : "fr"] : s.paymentMethod}</p>
                </div>
                <div className="flex flex-wrap gap-2 border-t border-[rgb(var(--border))] p-4">
                  {s.shop.whatsapp && <a href={waLink(s.shop.whatsapp, waMsg)} target="_blank" rel="noopener noreferrer" className="btn-wa"><WhatsAppIcon className="h-4 w-4" />{tx("Contacter le vendeur", "Contact seller")}</a>}
                  {provider?.kind === "online" && ["UNPAID", "FAILED", "PENDING"].includes(s.paymentStatus) && s.status !== "CANCELLED" && (
                    <form action={payOnlineAction}><input type="hidden" name="token" value={token} /><input type="hidden" name="subOrderId" value={s.id} />
                      <button className="btn-primary"><CreditCard className="h-4 w-4" />{tx("Payer en ligne", "Pay online")}</button></form>
                  )}
                </div>
                {provider?.kind === "offline" && ["UNPAID", "FAILED"].includes(s.paymentStatus) && s.status !== "CANCELLED" && s.paymentMethod !== "cod" && (
                  <details className="border-t border-[rgb(var(--border))] px-4 py-3 text-sm">
                    <summary className="cursor-pointer font-semibold">{tx("J'ai déjà payé le vendeur", "I already paid the seller")}</summary>
                    <form action={declarePaymentAction} className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <input type="hidden" name="token" value={token} /><input type="hidden" name="subOrderId" value={s.id} />
                      <input name="note" maxLength={300} placeholder={tx("Référence du transfert (ex. Orange Money, ID transaction)", "Transfer reference (e.g. Mobile Money transaction ID)")} className="input" />
                      <button className="btn-dark shrink-0">{tx("Déclarer", "Declare")}</button>
                    </form>
                    <p className="mt-2 text-xs muted">{tx("Votre déclaration sera vérifiée par le vendeur. Le statut « payé » n'est appliqué qu'après sa confirmation.", "The seller will verify your declaration. The order is marked paid only after confirmation.")}</p>
                  </details>
                )}
                {s.status === "DELIVERED" && (
                  <div className="border-t border-[rgb(var(--border))] px-4 py-3">
                    <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><Star className="h-4 w-4 text-gold-500" />{tx("Donnez votre avis (achat vérifié)", "Leave a review (verified purchase)")}</p>
                    {s.items.filter((it) => it.productId).map((it) => {
                      const existing = s.review.find((r) => r.productId === it.productId);
                      return (
                        <form key={it.id} action={submitReviewAction} className="mb-2 grid gap-2 sm:grid-cols-[1fr_auto_2fr_auto] sm:items-center">
                          <input type="hidden" name="token" value={token} /><input type="hidden" name="subOrderId" value={s.id} /><input type="hidden" name="productId" value={it.productId!} />
                          <span className="truncate text-sm">{it.title}</span>
                          <select name="rating" defaultValue={existing?.rating ?? 5} className="input py-2" aria-label="Note">{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)}</option>)}</select>
                          <input name="comment" defaultValue={existing?.comment} maxLength={1000} placeholder={tx("Votre commentaire", "Your comment")} className="input py-2" />
                          <button className="btn-ghost">{existing ? tx("Modifier", "Update") : tx("Publier", "Post")}</button>
                        </form>
                      );
                    })}
                  </div>
                )}
                <details className="border-t border-[rgb(var(--border))] px-4 py-3 text-xs">
                  <summary className="cursor-pointer font-semibold">{tx("Historique", "History")}</summary>
                  <ul className="mt-2 space-y-1.5">{s.events.map((e) => (
                    <li key={e.id} className="flex gap-2"><CircleDot className="mt-0.5 h-3 w-3 shrink-0 text-brand-500" /><span className="muted">{e.createdAt.toLocaleString(locale === "en" ? "en-GB" : "fr-FR")}</span>
                      <span>{e.type === "payment" ? m.payment[e.toValue as keyof typeof m.payment] : m.status[e.toValue as keyof typeof m.status] ?? e.toValue}{e.note ? ` — ${e.note}` : ""}</span></li>
                  ))}</ul>
                </details>
              </section>
            );
          })}
        </div>
        <p className="mt-6 text-center text-sm"><Link href="/produits" className="font-semibold text-brand-600">{tx("Continuer mes achats", "Continue shopping")}</Link></p>
      </div>
    </SiteShell>
  );
}
