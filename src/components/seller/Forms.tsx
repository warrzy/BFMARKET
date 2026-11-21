"use client";

import { useActionState } from "react";
import { addStaffAction, createCouponAction, importCatalogAction, subscribeAction, supportTicketAction } from "@/app/actions/seller";
import { FormMessage, SubmitButton } from "@/components/ui/SubmitButton";

export function CouponForm() {
  const [state, action] = useActionState(createCouponAction, undefined);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-3">
      <input name="code" required placeholder="CODE (ex. TABASKI10)" className="input uppercase" />
      <input name="percentOff" inputMode="numeric" placeholder="% de réduction" className="input" />
      <input name="amountOff" inputMode="numeric" placeholder="ou montant fixe" className="input" />
      <input name="maxUses" inputMode="numeric" placeholder="Utilisations max (optionnel)" className="input" />
      <input name="startsAt" type="datetime-local" className="input" aria-label="Début" />
      <input name="endsAt" type="datetime-local" className="input" aria-label="Fin" />
      <div className="sm:col-span-3"><FormMessage state={state} /></div>
      <SubmitButton className="btn-primary sm:col-span-3">Créer le code promo</SubmitButton>
    </form>
  );
}

export function ImportForm() {
  const [state, action] = useActionState(importCatalogAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="file" name="file" accept=".csv,.xlsx" required className="input" />
      <FormMessage state={state} />
      <SubmitButton pendingText="Import en cours…">Importer</SubmitButton>
    </form>
  );
}

export function SubscribeForm({ plan, label, disabled }: { plan: string; label: string; disabled?: boolean }) {
  const [state, action] = useActionState(subscribeAction, undefined);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="plan" value={plan} />
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-[rgb(var(--surface-2))] p-1 text-xs font-semibold">
        <label className="cursor-pointer rounded-lg py-1.5 text-center has-[:checked]:bg-[rgb(var(--surface))] has-[:checked]:shadow"><input type="radio" name="interval" value="monthly" defaultChecked className="sr-only" />Mensuel</label>
        <label className="cursor-pointer rounded-lg py-1.5 text-center has-[:checked]:bg-[rgb(var(--surface))] has-[:checked]:shadow"><input type="radio" name="interval" value="yearly" className="sr-only" />Annuel</label>
      </div>
      <input name="coupon" placeholder="Code de réduction" className="input py-2 text-sm uppercase" />
      <FormMessage state={state} />
      <SubmitButton className="btn-primary w-full" pendingText="…">{disabled ? "Offre actuelle" : label}</SubmitButton>
    </form>
  );
}

export function StaffForm() {
  const [state, action] = useActionState(addStaffAction, undefined);
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-[2fr_1fr_auto]">
      <input name="identifier" required placeholder="Téléphone ou e-mail du collaborateur" className="input" />
      <select name="role" className="input"><option value="STAFF">Employé</option><option value="MANAGER">Gérant</option></select>
      <SubmitButton className="btn-dark">Ajouter</SubmitButton>
      <div className="sm:col-span-3"><FormMessage state={state} /></div>
    </form>
  );
}

export function TicketForm() {
  const [state, action] = useActionState(supportTicketAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <input name="subject" required placeholder="Sujet" className="input" />
      <textarea name="message" required rows={5} placeholder="Décrivez votre besoin…" className="input" />
      <FormMessage state={state} />
      <SubmitButton>Envoyer</SubmitButton>
    </form>
  );
}
