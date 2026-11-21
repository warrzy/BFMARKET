"use client";

import { useActionState, useState } from "react";
import { onboardingInfoAction, onboardingProductAction, onboardingSkipProductAction, onboardingVisualsAction } from "@/app/actions/onboarding";
import { FormMessage, SubmitButton } from "@/components/ui/SubmitButton";
import { ImagePicker } from "./ImagePicker";

interface Country { code: string; name: string; flag: string; dial: string; cities: { id: string; name: string }[] }

export function InfoStep({ countries, initial }: { countries: Country[]; initial: { name?: string; country?: string; cityId?: string; sector?: string; whatsapp?: string } }) {
  const [state, action] = useActionState(onboardingInfoAction, undefined);
  const [country, setCountry] = useState(initial.country ?? countries[0]?.code);
  const c = countries.find((x) => x.code === country);
  return (
    <form action={action} className="space-y-4">
      <div><label className="label" htmlFor="name">Nom de la boutique</label><input id="name" name="name" defaultValue={initial.name} required className="input" placeholder="Ex. Awa Couture" /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="country">Pays</label><select id="country" name="country" className="input" value={country} onChange={(e) => setCountry(e.target.value)}>{countries.map((x) => <option key={x.code} value={x.code}>{x.flag} {x.name}</option>)}</select></div>
        <div><label className="label" htmlFor="cityId">Ville</label><select id="cityId" name="cityId" className="input" defaultValue={initial.cityId ?? ""} required><option value="" disabled>Choisir…</option>{c?.cities.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
      </div>
      <div><label className="label" htmlFor="sector">Secteur d&apos;activité</label>
        <input id="sector" name="sector" list="sectors" defaultValue={initial.sector} required className="input" placeholder="Mode, téléphones, beauté…" />
        <datalist id="sectors">{["Mode", "Téléphones", "Informatique", "Beauté", "Alimentation", "Artisanat", "Maison", "Électroménager", "Automobile", "Énergie solaire", "Services", "Formation"].map((s) => <option key={s} value={s} />)}</datalist></div>
      <div><label className="label" htmlFor="whatsapp">Numéro WhatsApp de la boutique</label>
        <div className="relative"><span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm muted">+{c?.dial}</span><input id="whatsapp" name="whatsapp" type="tel" defaultValue={initial.whatsapp} required className="input pl-16" /></div></div>
      <FormMessage state={state} />
      <SubmitButton pendingText="Enregistrement…">Continuer</SubmitButton>
    </form>
  );
}

export function VisualsStep() {
  const [state, action] = useActionState(onboardingVisualsAction, undefined);
  return (
    <form action={action} className="space-y-5">
      <ImagePicker name="logo" label="Logo (carré)" aspect="square" />
      <ImagePicker name="cover" label="Image de couverture (bannière)" aspect="wide" />
      <FormMessage state={state} />
      <SubmitButton pendingText="Envoi des images…">Continuer</SubmitButton>
      <p className="text-center text-xs muted">Modifiables à tout moment. Sans image, un visuel aux couleurs de votre boutique est affiché.</p>
    </form>
  );
}

export function ProductStep({ currency, categories }: { currency: string; categories: { id: string; name: string }[] }) {
  const [state, action] = useActionState(onboardingProductAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <ImagePicker name="images" label="Photos du produit" aspect="square" multiple />
      <div><label className="label" htmlFor="title">Nom du produit</label><input id="title" name="title" className="input" placeholder="Ex. Robe en wax taille M" /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="price">Prix ({currency})</label><input id="price" name="price" inputMode="numeric" className="input" placeholder="15000" /></div>
        <div><label className="label" htmlFor="categoryId">Catégorie</label><select id="categoryId" name="categoryId" className="input" defaultValue=""><option value="">—</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      </div>
      <div><label className="label" htmlFor="description">Description</label><textarea id="description" name="description" rows={3} className="input" placeholder="Matière, taille, couleur, état…" /></div>
      <FormMessage state={state} />
      <SubmitButton pendingText="Publication…">Publier ce produit</SubmitButton>
    </form>
  );
}

export function SkipProductStep() {
  return (
    <form action={onboardingSkipProductAction} className="mt-3">
      <SubmitButton className="w-full text-sm font-semibold muted" pendingText="…">Passer cette étape</SubmitButton>
    </form>
  );
}
