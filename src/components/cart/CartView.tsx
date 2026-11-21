"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Minus, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useCart, type CartLine } from "./CartProvider";
import { formatPrice } from "@/lib/money";
import { getCheckoutOptions, placeOrder } from "@/app/actions/checkout";

type Options = Awaited<ReturnType<typeof getCheckoutOptions>>;
interface Country { code: string; name: string; flag: string; cities: string[] }

export function CartView({ countries, defaultCountry, defaultCity, user, locale }: {
  countries: Country[]; defaultCountry?: string; defaultCity?: string; user?: { name: string; phone?: string | null; email?: string | null } | null; locale: string;
}) {
  const en = locale === "en";
  const t = (fr: string, e: string) => (en ? e : fr);
  const { lines, setQty, remove, clear, ready } = useCart();
  const router = useRouter();
  const [opts, setOpts] = useState<Options>([]);
  const [choices, setChoices] = useState<Record<string, { deliveryOptionId?: string | null; paymentMethod: string; couponCode?: string }>>({});
  const [country, setCountry] = useState(defaultCountry ?? countries[0]?.code ?? "");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const groups = useMemo(() => {
    const m = new Map<string, CartLine[]>();
    lines.forEach((l) => m.set(l.shopId, [...(m.get(l.shopId) ?? []), l]));
    return [...m.entries()];
  }, [lines]);
  const shopKey = groups.map(([id]) => id).join(",");

  useEffect(() => {
    if (!shopKey) return;
    getCheckoutOptions(shopKey.split(",")).then((o) => {
      setOpts(o);
      setChoices((prev) => {
        const next = { ...prev };
        o.forEach((s) => { if (!next[s.id]) next[s.id] = { deliveryOptionId: s.delivery[0]?.id ?? null, paymentMethod: s.payments[0]?.code ?? "" }; });
        return next;
      });
    });
  }, [shopKey]);

  if (!ready) return <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="skeleton h-28" />)}</div>;
  if (lines.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-lg font-semibold">{t("Votre panier est vide.", "Your cart is empty.")}</p>
        <Link href="/produits" className="btn-primary mt-4">{t("Découvrir les produits", "Browse products")}</Link>
      </div>
    );
  }

  const cities = countries.find((c) => c.code === country)?.cities ?? [];

  const submit = (form: FormData) => {
    setError("");
    const missing = groups.find(([id]) => !choices[id]?.paymentMethod);
    if (missing) return setError(t("Aucun mode de paiement disponible pour une des boutiques.", "No payment method available for one of the shops."));
    const city = String(form.get("city") === "__other" ? form.get("cityOther") : form.get("city") ?? "");
    start(async () => {
      const r = await placeOrder({
        lines: lines.map((l) => ({ productId: l.productId, variantId: l.variantId ?? null, quantity: l.quantity })),
        name: form.get("name"), phone: form.get("phone"), email: form.get("email") || "", countryCode: country, city,
        neighborhood: form.get("neighborhood") || undefined, landmark: form.get("landmark") || undefined, note: form.get("note") || undefined,
        perShop: choices, consent: form.get("consent") === "on",
      });
      if (r.ok) { clear(); router.push(`/commande/suivi/${r.trackingToken}?nouvelle=1`); }
      else setError(r.error);
    });
  };

  return (
    <form action={submit} className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        <p className="text-sm muted">{t("Chaque boutique traite sa partie de la commande séparément (livraison, paiement, suivi).", "Each shop handles its part of the order separately (delivery, payment, tracking).")}</p>
        {groups.map(([shopId, ls]) => {
          const o = opts.find((x) => x.id === shopId);
          const c = choices[shopId];
          const subtotal = ls.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
          const delivery = o?.delivery.find((d) => d.id === c?.deliveryOptionId);
          return (
            <div key={shopId} className="card overflow-hidden">
              <div className="border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] px-4 py-2.5 text-sm font-semibold">{ls[0].shopName}</div>
              <ul className="divide-y divide-[rgb(var(--border))]">
                {ls.map((l) => (
                  <li key={`${l.productId}-${l.variantId}`} className="flex gap-3 p-4">
                    <Link href={`/produit/${l.slug}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[rgb(var(--surface-2))]">
                      {l.image && <Image src={l.image} alt="" fill sizes="80px" className="object-cover" />}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-medium">{l.title}</p>
                      {l.variantName && <p className="text-xs muted">{l.variantName}</p>}
                      <p className="mt-1 font-bold">{formatPrice(l.unitPrice * l.quantity, l.currency, locale)}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex items-center rounded-lg border border-[rgb(var(--border))]">
                          <button type="button" className="p-1.5" onClick={() => setQty(l.productId, l.variantId, l.quantity - 1)} aria-label="-"><Minus className="h-3.5 w-3.5" /></button>
                          <span className="w-8 text-center text-sm tabular-nums">{l.quantity}</span>
                          <button type="button" className="p-1.5" onClick={() => setQty(l.productId, l.variantId, l.quantity + 1)} aria-label="+"><Plus className="h-3.5 w-3.5" /></button>
                        </div>
                        <button type="button" className="p-1.5 muted hover:text-red-600" onClick={() => remove(l.productId, l.variantId)} aria-label={t("Retirer", "Remove")}><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              {o && (
                <div className="grid gap-3 border-t border-[rgb(var(--border))] p-4 sm:grid-cols-2">
                  <label className="text-sm"><span className="label">{t("Livraison", "Delivery")}</span>
                    <select className="input" value={c?.deliveryOptionId ?? ""} onChange={(e) => setChoices({ ...choices, [shopId]: { ...c!, deliveryOptionId: e.target.value || null } })}>
                      {o.delivery.length === 0 && <option value="">{t("À convenir avec le vendeur", "To agree with seller")}</option>}
                      {o.delivery.map((d) => <option key={d.id} value={d.id}>{d.name} — {d.feeOnQuote ? t("sur devis", "on quote") : d.fee ? formatPrice(d.fee, ls[0].currency, locale) : t("gratuit", "free")}</option>)}
                    </select>
                  </label>
                  <label className="text-sm"><span className="label">{t("Paiement", "Payment")}</span>
                    <select className="input" value={c?.paymentMethod ?? ""} onChange={(e) => setChoices({ ...choices, [shopId]: { ...c!, paymentMethod: e.target.value } })}>
                      {o.payments.map((p) => <option key={p.code} value={p.code}>{p.label}</option>)}
                    </select>
                  </label>
                  <label className="text-sm sm:col-span-2"><span className="label">{t("Code promo (optionnel)", "Promo code (optional)")}</span>
                    <input className="input uppercase" maxLength={30} value={c?.couponCode ?? ""} onChange={(e) => setChoices({ ...choices, [shopId]: { ...c!, couponCode: e.target.value } })} />
                  </label>
                  <p className="text-sm sm:col-span-2">{t("Sous-total", "Subtotal")} : <b>{formatPrice(subtotal + (delivery && !delivery.feeOnQuote ? delivery.fee : 0), ls[0].currency, locale)}</b>
                    {delivery?.feeOnQuote && <span className="muted"> + {t("livraison sur devis", "delivery on quote")}</span>}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="card h-fit space-y-3 p-5 lg:sticky lg:top-24">
        <h2 className="text-lg font-bold">{t("Vos coordonnées", "Your details")}</h2>
        <input name="name" required minLength={2} defaultValue={user?.name} placeholder={t("Nom complet", "Full name")} className="input" autoComplete="name" />
        <div className="flex gap-2">
          <select className="input w-28" value={country} onChange={(e) => setCountry(e.target.value)} aria-label={t("Pays", "Country")}>
            {countries.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
          </select>
          <input name="phone" required type="tel" inputMode="tel" defaultValue={user?.phone ?? ""} placeholder={t("Téléphone / WhatsApp", "Phone / WhatsApp")} className="input" autoComplete="tel" />
        </div>
        <input name="email" type="email" defaultValue={user?.email ?? ""} placeholder={t("E-mail (optionnel)", "Email (optional)")} className="input" autoComplete="email" />
        <select name="city" required className="input" defaultValue={defaultCity ?? ""} aria-label={t("Ville", "City")}>
          <option value="" disabled>{t("Ville", "City")}</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          <option value="__other">{t("Autre ville…", "Other city…")}</option>
        </select>
        <input name="cityOther" placeholder={t("Si autre ville, précisez", "If other city, specify")} className="input" />
        <input name="neighborhood" placeholder={t("Quartier / secteur", "Neighborhood")} className="input" />
        <input name="landmark" placeholder={t("Point de repère (ex. près de la pharmacie…)", "Landmark (e.g. near the pharmacy…)")} className="input" />
        <textarea name="note" rows={2} placeholder={t("Note pour le vendeur (optionnel)", "Note for the seller (optional)")} className="input" />
        <label className="flex items-start gap-2 text-xs muted">
          <input type="checkbox" name="consent" required className="mt-0.5" />
          <span>{t("J'accepte que mes coordonnées soient transmises aux vendeurs concernés pour traiter ma commande, et les ", "I agree that my details are shared with the relevant sellers to process my order, and the ")}<Link href="/conditions" className="underline">{t("conditions d'utilisation", "terms of use")}</Link>.</span>
        </label>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
        <button className="btn-primary w-full py-3.5 text-base" disabled={pending}>{pending ? t("Envoi…", "Sending…") : t("Confirmer la commande", "Confirm order")}</button>
        <p className="flex items-start gap-2 text-xs muted"><ShieldCheck className="h-4 w-4 shrink-0 text-wa-600" />{t("Aucune commande n'est marquée payée sans confirmation du paiement par le vendeur ou le prestataire.", "No order is marked paid without payment confirmation by the seller or the provider.")}</p>
      </div>
    </form>
  );
}
