"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { loginAction, resendCodeAction, signupAction, verifyCodeAction, type FormState } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/ui/SubmitButton";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <div><label className="label" htmlFor="identifier">Téléphone ou e-mail</label><input id="identifier" name="identifier" required className="input" autoComplete="username" placeholder="70 12 34 56 ou vous@exemple.com" /></div>
      <div><label className="label" htmlFor="password">Mot de passe</label><input id="password" name="password" type="password" required className="input" autoComplete="current-password" /></div>
      <FormMessage state={state} />
      <SubmitButton pendingText="Connexion…">Se connecter</SubmitButton>
      <p className="text-center text-sm muted">Pas encore de compte ? <Link href={`/inscription${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-brand-600">Créer un compte</Link></p>
    </form>
  );
}

export function SignupForm({ countries, defaultCountry, intent }: { countries: { code: string; name: string; flag: string; dial: string }[]; defaultCountry?: string; intent: "buyer" | "seller" }) {
  const [state, action] = useActionState(signupAction, undefined);
  const [country, setCountry] = useState(defaultCountry ?? countries[0]?.code);
  const dial = countries.find((c) => c.code === country)?.dial;
  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-[rgb(var(--surface-2))] p-1 text-sm font-semibold">
        <label className="cursor-pointer rounded-lg py-2 text-center has-[:checked]:bg-[rgb(var(--surface))] has-[:checked]:shadow"><input type="radio" name="intent" value="buyer" defaultChecked={intent === "buyer"} className="sr-only" />J&apos;achète</label>
        <label className="cursor-pointer rounded-lg py-2 text-center has-[:checked]:bg-[rgb(var(--surface))] has-[:checked]:shadow"><input type="radio" name="intent" value="seller" defaultChecked={intent === "seller"} className="sr-only" />Je vends</label>
      </div>
      <div><label className="label" htmlFor="name">Nom complet</label><input id="name" name="name" required minLength={2} className="input" autoComplete="name" /></div>
      <div><label className="label" htmlFor="country">Pays</label>
        <select id="country" name="country" className="input" value={country} onChange={(e) => setCountry(e.target.value)}>{countries.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}</select></div>
      <div><label className="label" htmlFor="identifier">Téléphone (WhatsApp) ou e-mail</label>
        <div className="relative"><span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm muted">+{dial}</span>
          <input id="identifier" name="identifier" required className="input pl-16" autoComplete="tel" placeholder="70 12 34 56" /></div>
        <p className="mt-1 text-xs muted">Un code de vérification vous sera envoyé.</p></div>
      <div><label className="label" htmlFor="password">Mot de passe</label><input id="password" name="password" type="password" required minLength={8} className="input" autoComplete="new-password" /></div>
      <label className="flex items-start gap-2 text-xs muted"><input type="checkbox" name="terms" required className="mt-0.5" /><span>J&apos;accepte les <Link href="/conditions" className="underline">conditions d&apos;utilisation</Link> et la <Link href="/confidentialite" className="underline">politique de confidentialité</Link>.</span></label>
      <FormMessage state={state} />
      <SubmitButton pendingText="Création…">Créer mon compte</SubmitButton>
      <p className="text-center text-sm muted">Déjà inscrit ? <Link href="/connexion" className="font-semibold text-brand-600">Se connecter</Link></p>
    </form>
  );
}

export function VerifyForm({ next, devCode }: { next: string; devCode?: string }) {
  const [state, action] = useActionState(verifyCodeAction, undefined);
  const [resend, setResend] = useState<FormState>(devCode ? { devCode } : undefined);
  return (
    <div className="space-y-4">
      {resend?.devCode && <p className="rounded-xl border border-dashed border-gold-500 p-3 text-sm">Mode développement — code : <b className="font-mono">{resend.devCode}</b></p>}
      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <input name="code" required inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="\d{6}" className="input text-center font-mono text-2xl tracking-[.5em]" placeholder="••••••" aria-label="Code à 6 chiffres" />
        <FormMessage state={state} />
        <SubmitButton pendingText="Vérification…">Vérifier</SubmitButton>
      </form>
      <button type="button" className="w-full text-sm font-semibold text-brand-600" onClick={async () => setResend(await resendCodeAction())}>Renvoyer un code</button>
      <FormMessage state={resend} />
    </div>
  );
}
