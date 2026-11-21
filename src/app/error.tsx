"use client";

import Link from "next/link";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const forbidden = error.message === "Accès refusé" || error.message.includes("Rôle insuffisant");
  return (
    <div className="grid min-h-[70dvh] place-items-center p-6 text-center">
      <div>
        <h1 className="text-2xl font-extrabold">{forbidden ? "Accès refusé" : "Une erreur est survenue"}</h1>
        <p className="mt-2 muted">{forbidden ? "Vous n'avez pas les droits nécessaires pour cette action." : "Réessayez dans un instant. Si le problème persiste, contactez l'assistance."}</p>
        {error.digest && <p className="mt-1 font-mono text-xs muted">Réf. {error.digest}</p>}
        <div className="mt-6 flex justify-center gap-2"><button onClick={reset} className="btn-primary">Réessayer</button><Link href="/" className="btn-ghost">Accueil</Link></div>
      </div>
    </div>
  );
}
