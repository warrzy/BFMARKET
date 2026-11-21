"use client";

import { useActionState } from "react";
import { updateShopAction } from "@/app/actions/seller";
import { FormMessage, SubmitButton } from "@/components/ui/SubmitButton";
import { ImagePicker } from "./ImagePicker";

interface Props {
  shop: { name: string; tagline: string | null; description: string; sector: string | null; cityId: string | null; neighborhood: string | null; address: string | null; whatsapp: string | null; phone: string | null; email: string | null; deliveryPolicy: string | null; returnPolicy: string | null; theme: string; accentColor: string; logoUrl: string | null; coverUrl: string | null; openingHours: Record<string, string>; socials: Record<string, string> };
  cities: { id: string; name: string }[];
  canCustomize: boolean;
}

const THEMES = [
  { id: "savane", name: "Savane", desc: "Chaleureux, terre cuite", premium: false },
  { id: "nuit", name: "Nuit", desc: "Élégant, sombre", premium: true },
  { id: "kente", name: "Kente", desc: "Motifs et couleurs vives", premium: true },
  { id: "minimal", name: "Minimal", desc: "Épuré, très lisible", premium: true },
];

export function ShopSettingsForm({ shop, cities, canCustomize }: Props) {
  const [state, action] = useActionState(updateShopAction, undefined);
  return (
    <form action={action} className="space-y-6">
      <section className="card grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="font-bold sm:col-span-2">Identité</h2>
        <div><label className="label" htmlFor="name">Nom commercial</label><input id="name" name="name" required defaultValue={shop.name} className="input" /></div>
        <div><label className="label" htmlFor="sector">Secteur</label><input id="sector" name="sector" defaultValue={shop.sector ?? ""} className="input" /></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="tagline">Slogan</label><input id="tagline" name="tagline" maxLength={120} defaultValue={shop.tagline ?? ""} className="input" /></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="description">Présentation de l&apos;entreprise</label><textarea id="description" name="description" rows={4} defaultValue={shop.description} className="input" /></div>
        <ImagePicker name="logo" label="Logo" existing={shop.logoUrl ? [shop.logoUrl] : []} />
        <ImagePicker name="cover" label="Bannière" aspect="wide" existing={shop.coverUrl ? [shop.coverUrl] : []} />
      </section>
      <section className="card grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="font-bold sm:col-span-2">Contact et localisation</h2>
        <div><label className="label" htmlFor="whatsapp">WhatsApp</label><input id="whatsapp" name="whatsapp" type="tel" defaultValue={shop.whatsapp ?? ""} className="input" /></div>
        <div><label className="label" htmlFor="phone">Téléphone</label><input id="phone" name="phone" type="tel" defaultValue={shop.phone ?? ""} className="input" /></div>
        <div><label className="label" htmlFor="email">E-mail</label><input id="email" name="email" type="email" defaultValue={shop.email ?? ""} className="input" /></div>
        <div><label className="label" htmlFor="cityId">Ville</label><select id="cityId" name="cityId" defaultValue={shop.cityId ?? ""} className="input">{cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div><label className="label" htmlFor="neighborhood">Quartier</label><input id="neighborhood" name="neighborhood" defaultValue={shop.neighborhood ?? ""} className="input" /></div>
        <div><label className="label" htmlFor="address">Adresse / repère</label><input id="address" name="address" defaultValue={shop.address ?? ""} className="input" /></div>
        <div><label className="label" htmlFor="hours_lun_ven">Horaires lundi–vendredi</label><input id="hours_lun_ven" name="hours_lun_ven" defaultValue={shop.openingHours.lun_ven ?? ""} placeholder="08:00–19:00" className="input" /></div>
        <div className="grid grid-cols-2 gap-2"><div><label className="label" htmlFor="hours_sam">Samedi</label><input id="hours_sam" name="hours_sam" defaultValue={shop.openingHours.sam ?? ""} className="input" /></div><div><label className="label" htmlFor="hours_dim">Dimanche</label><input id="hours_dim" name="hours_dim" defaultValue={shop.openingHours.dim ?? ""} className="input" /></div></div>
        <div><label className="label" htmlFor="facebook">Page Facebook</label><input id="facebook" name="facebook" defaultValue={shop.socials.facebook ?? ""} className="input" /></div>
        <div><label className="label" htmlFor="tiktok">Compte TikTok</label><input id="tiktok" name="tiktok" defaultValue={shop.socials.tiktok ?? ""} className="input" /></div>
        <input type="hidden" name="instagram" value={shop.socials.instagram ?? ""} />
      </section>
      <section className="card grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="font-bold sm:col-span-2">Politiques</h2>
        <div><label className="label" htmlFor="deliveryPolicy">Livraison</label><textarea id="deliveryPolicy" name="deliveryPolicy" rows={3} defaultValue={shop.deliveryPolicy ?? ""} className="input" /></div>
        <div><label className="label" htmlFor="returnPolicy">Retours et échanges</label><textarea id="returnPolicy" name="returnPolicy" rows={3} defaultValue={shop.returnPolicy ?? ""} className="input" /></div>
      </section>
      <section className="card space-y-4 p-5">
        <h2 className="font-bold">Apparence</h2>
        <div className="grid gap-2 sm:grid-cols-4">
          {THEMES.map((t) => (
            <label key={t.id} className={`cursor-pointer rounded-xl border-2 border-[rgb(var(--border))] p-3 has-[:checked]:border-brand-500 ${t.premium && !canCustomize ? "opacity-50" : ""}`}>
              <input type="radio" name="theme" value={t.id} defaultChecked={shop.theme === t.id} disabled={t.premium && !canCustomize} className="sr-only" />
              <span className="block font-semibold">{t.name}{t.premium && <span className="badge ml-1 bg-gold-400/30 text-amber-800 dark:text-gold-400">Pro</span>}</span><span className="text-xs muted">{t.desc}</span>
            </label>
          ))}
        </div>
        <div className="flex items-center gap-3"><label className="label mb-0" htmlFor="accentColor">Couleur principale</label><input id="accentColor" name="accentColor" type="color" defaultValue={shop.accentColor} className="h-10 w-16 cursor-pointer rounded-lg border border-[rgb(var(--border))]" /></div>
      </section>
      <FormMessage state={state} />
      <div className="sticky bottom-4"><SubmitButton className="btn-primary w-full py-3 shadow-lift" pendingText="Enregistrement…">Enregistrer</SubmitButton></div>
    </form>
  );
}
