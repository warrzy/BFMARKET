"use client";

import { useActionState } from "react";
import { createPlatformCouponAction, saveBannerAction, saveCategoryAction, savePlanAction, saveSettingsAction } from "@/app/actions/admin";
import { FormMessage, SubmitButton } from "@/components/ui/SubmitButton";

export function CategoryForm({ parents, initial }: { parents: { id: string; name: string }[]; initial?: { id: string; nameFr: string; nameEn: string; parentId: string | null; icon: string; sortOrder: number; attributes: unknown } }) {
  const [state, action] = useActionState(saveCategoryAction, undefined);
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-6">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <input name="nameFr" required defaultValue={initial?.nameFr} placeholder="Nom (FR)" className="input sm:col-span-2" />
      <input name="nameEn" required defaultValue={initial?.nameEn} placeholder="Name (EN)" className="input sm:col-span-2" />
      <select name="parentId" defaultValue={initial?.parentId ?? ""} className="input"><option value="">— Racine —</option>{parents.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      <input name="icon" defaultValue={initial?.icon ?? "tag"} placeholder="Icône" className="input" />
      <input name="sortOrder" defaultValue={initial?.sortOrder ?? 100} inputMode="numeric" className="input" aria-label="Ordre" />
      <textarea name="attributes" defaultValue={JSON.stringify(initial?.attributes ?? [])} rows={2} className="input font-mono text-xs sm:col-span-4" aria-label="Attributs JSON" placeholder='[{"key":"taille","labelFr":"Taille","labelEn":"Size","type":"select","options":["S","M"]}]' />
      <SubmitButton className="btn-dark">{initial ? "Enregistrer" : "Ajouter"}</SubmitButton>
      <div className="sm:col-span-6"><FormMessage state={state} /></div>
    </form>
  );
}

export function PlanForm({ plan }: { plan: { id: string; code: string; nameFr: string; nameEn: string; descriptionFr: string; trialDays: number; active: boolean; features: Record<string, unknown> } }) {
  const [state, action] = useActionState(savePlanAction, undefined);
  const f = plan.features;
  const flags: [string, string][] = [["promotions", "Promotions"], ["advancedStats", "Stats avancées"], ["customization", "Personnalisation"], ["import", "Import"], ["ai", "IA"], ["featured", "Mise en avant"], ["prioritySupport", "Support prioritaire"], ["advancedStock", "Stock avancé"]];
  return (
    <form action={action} className="space-y-2 text-sm">
      <input type="hidden" name="id" value={plan.id} />
      <div className="grid grid-cols-2 gap-2"><input name="nameFr" defaultValue={plan.nameFr} className="input" aria-label="Nom FR" /><input name="nameEn" defaultValue={plan.nameEn} className="input" aria-label="Nom EN" /></div>
      <input name="descriptionFr" defaultValue={plan.descriptionFr} className="input" aria-label="Description" />
      <div className="grid grid-cols-3 gap-2">
        <label>Produits max<input name="maxProducts" defaultValue={f.maxProducts == null ? "" : String(f.maxProducts)} placeholder="∞" className="input" /></label>
        <label>Collaborateurs<input name="staffAccounts" defaultValue={String(f.staffAccounts ?? 0)} className="input" /></label>
        <label>Jours d&apos;essai<input name="trialDays" defaultValue={plan.trialDays} className="input" /></label>
      </div>
      <div className="flex flex-wrap gap-3">{flags.map(([k, l]) => <label key={k} className="flex items-center gap-1"><input type="checkbox" name={k} defaultChecked={!!f[k]} />{l}</label>)}
        <label className="flex items-center gap-1 font-semibold"><input type="checkbox" name="active" defaultChecked={plan.active} />Offre active</label></div>
      <FormMessage state={state} />
      <SubmitButton className="btn-dark">Enregistrer {plan.code}</SubmitButton>
    </form>
  );
}

export function PlatformCouponForm() {
  const [state, action] = useActionState(createPlatformCouponAction, undefined);
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-5">
      <input name="code" required placeholder="CODE" className="input uppercase" />
      <input name="percentOff" required inputMode="numeric" placeholder="% réduction" className="input" />
      <input name="maxUses" inputMode="numeric" placeholder="Utilisations max" className="input" />
      <input name="endsAt" type="date" className="input" aria-label="Fin" />
      <SubmitButton className="btn-dark">Créer</SubmitButton>
      <div className="sm:col-span-5"><FormMessage state={state} /></div>
    </form>
  );
}

export function BannerForm({ countries }: { countries: { code: string; name: string }[] }) {
  const [state, action] = useActionState(saveBannerAction, undefined);
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-2">
      <input name="titleFr" required placeholder="Titre (FR)" className="input" />
      <input name="titleEn" placeholder="Title (EN)" className="input" />
      <input name="subtitleFr" placeholder="Sous-titre (FR)" className="input" />
      <input name="subtitleEn" placeholder="Subtitle (EN)" className="input" />
      <input name="href" placeholder="Lien (/ouvrir-boutique ou https://…)" className="input" />
      <select name="countryCode" className="input"><option value="">Tous les pays</option>{countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select>
      <select name="placement" className="input"><option value="home_strip">Accueil — bandeau</option><option value="home_hero">Accueil — hero</option></select>
      <input name="image" type="file" accept="image/*" className="input" />
      <div className="sm:col-span-2"><FormMessage state={state} /></div>
      <SubmitButton className="btn-dark sm:col-span-2">Créer la bannière</SubmitButton>
    </form>
  );
}

export function SettingsForm({ supportWhatsapp, moderation }: { supportWhatsapp: string; moderation: string }) {
  const [state, action] = useActionState(saveSettingsAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <div><label className="label" htmlFor="sw">Numéro WhatsApp du support (format international, ex. 22670000000)</label><input id="sw" name="supportWhatsapp" defaultValue={supportWhatsapp} className="input max-w-sm" /></div>
      <div><label className="label" htmlFor="mod">Modération des nouveaux produits</label>
        <select id="mod" name="moderation" defaultValue={moderation} className="input max-w-sm"><option value="post">A posteriori (publication immédiate, signalements)</option><option value="pre">A priori (validation avant publication)</option></select></div>
      <FormMessage state={state} />
      <SubmitButton className="btn-primary">Enregistrer</SubmitButton>
    </form>
  );
}
