import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center p-6 text-center">
      <div><Logo /><p className="mt-8 font-display text-7xl font-extrabold text-brand-500">404</p><h1 className="mt-2 text-xl font-bold">Page introuvable</h1>
        <p className="mt-1 muted">Ce produit ou cette boutique n&apos;existe plus ou a changé d&apos;adresse.</p>
        <div className="mt-6 flex justify-center gap-2"><Link href="/" className="btn-primary">Accueil</Link><Link href="/produits" className="btn-ghost">Voir les produits</Link></div></div>
    </div>
  );
}
