"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ children, className = "btn-primary w-full", pendingText, formAction }: {
  children: React.ReactNode; className?: string; pendingText?: string; formAction?: (form: FormData) => void | Promise<void>;
}) {
  // Désactivé pendant l'envoi : évite les doubles soumissions sur réseau lent.
  const { pending } = useFormStatus();
  return <button className={className} disabled={pending} formAction={formAction}>{pending ? pendingText ?? "…" : children}</button>;
}

export function FormMessage({ state }: { state?: { error?: string; ok?: string } }) {
  if (state?.error) return <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{state.error}</p>;
  if (state?.ok) return <p role="status" className="rounded-xl bg-wa-500/10 p-3 text-sm text-wa-600">{state.ok}</p>;
  return null;
}
