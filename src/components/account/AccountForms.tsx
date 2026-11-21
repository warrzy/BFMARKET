"use client";

import { useActionState } from "react";
import { deleteAccountAction, reportAction } from "@/app/actions/account";
import { FormMessage, SubmitButton } from "@/components/ui/SubmitButton";

export function DeleteAccountForm() {
  const [state, action] = useActionState(deleteAccountAction, undefined);
  return (
    <form action={action} className="space-y-2">
      <input name="password" type="password" required placeholder="Confirmez avec votre mot de passe" className="input max-w-sm" autoComplete="current-password" />
      <FormMessage state={state} />
      <SubmitButton className="btn-danger">Supprimer définitivement mon compte</SubmitButton>
    </form>
  );
}

const REASONS = ["Produit interdit ou dangereux", "Contrefaçon", "Arnaque / fraude", "Contenu choquant", "Informations trompeuses", "Autre"];

export function ReportForm({ productId, shopId }: { productId?: string; shopId?: string }) {
  const [state, action] = useActionState(reportAction, undefined);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-3">
      {productId && <input type="hidden" name="productId" value={productId} />}
      {shopId && <input type="hidden" name="shopId" value={shopId} />}
      <select name="reason" required className="input" defaultValue=""><option value="" disabled>Motif du signalement</option>{REASONS.map((r) => <option key={r}>{r}</option>)}</select>
      <textarea name="details" rows={4} maxLength={2000} placeholder="Détails (optionnel)" className="input" />
      <FormMessage state={state} />
      <SubmitButton>Envoyer le signalement</SubmitButton>
    </form>
  );
}
