import Link from "next/link";
import { ArrowRight, BarChart3, Link2, MessageCircle, QrCode, ShieldCheck, Smartphone, Store, Truck } from "lucide-react";
import { db } from "@/server/db";
import { SiteShell } from "@/components/layout/SiteShell";

export const metadata = { title: "Vendre en ligne", description: "Créez gratuitement votre boutique en ligne en 5 minutes. Zéro commission sur vos ventes." };

export default async function SellPage() {
  const [shops, products] = await Promise.all([db.shop.count({ where: { status: "ACTIVE" } }), db.product.count({ where: { status: "ACTIVE", deletedAt: null } })]);
  const features = [
    { icon: Store, t: "Votre boutique, votre adresse", d: "Un lien unique à mettre dans vos statuts, votre bio et vos publicités, à la place de votre numéro." },
    { icon: MessageCircle, t: "Commandes WhatsApp structurées", d: "Le client voit le prix, choisit la variante et vous envoie un message déjà rempli avec la référence." },
    { icon: Smartphone, t: "Tout depuis votre téléphone", d: "Photos, prix, stock, commandes : aucun ordinateur nécessaire. Pages légères, même en 3G." },
    { icon: Truck, t: "Livraison à votre façon", d: "Vos zones, vos frais, retrait sur place ou expédition : vous restez maître de la livraison." },
    { icon: BarChart3, t: "Statistiques claires", d: "Visites, commandes, produits populaires, montants réellement encaissés." },
    { icon: QrCode, t: "QR code et partage", d: "Imprimez votre QR code, partagez vos produits sur Facebook, TikTok et WhatsApp en un clic." },
  ];
  return (
    <SiteShell>
      <section className="bg-mesh text-white">
        <div className="container-x py-16 text-center sm:py-24">
          <p className="mx-auto w-fit rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">Fini les « c&apos;est combien ? » sans suite</p>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-extrabold leading-tight sm:text-6xl">Vos clients voient les prix et commandent seuls. Vous, vous livrez.</h1>
          <p className="mx-auto mt-5 max-w-xl text-night-100">Créez votre boutique en ligne gratuitement en 5 minutes. Gardez 100 % de vos ventes : ECOM MARKET ne prend aucune commission.</p>
          <Link href="/ouvrir-boutique" className="btn-primary mt-8 px-8 py-4 text-base">Créer ma boutique gratuitement<ArrowRight className="h-5 w-5" /></Link>
          <p className="mt-3 text-xs text-night-200">Sans carte bancaire · Sans rien installer · {shops} boutiques et {products} produits déjà en ligne</p>
        </div>
      </section>
      <section className="container-x mt-14">
        <h2 className="text-center text-3xl font-extrabold">Comment ça marche</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-4">
          {[["Créez votre boutique", "Nom, ville, WhatsApp."], ["Ajoutez vos produits", "Photos, prix, variantes, stock."], ["Partagez votre lien", "Statuts, groupes, pages, publicités."], ["Recevez les commandes", "Nom, téléphone, quartier, point de repère."]].map(([t, d], i) => (
            <li key={t} className="card p-5"><span className="font-display text-4xl font-extrabold text-brand-500">{i + 1}</span><h3 className="mt-2 font-bold">{t}</h3><p className="text-sm muted">{d}</p></li>
          ))}
        </ol>
      </section>
      <section className="container-x mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => <div key={f.t} className="card p-6"><f.icon className="h-7 w-7 text-brand-500" /><h3 className="mt-3 font-bold">{f.t}</h3><p className="mt-1 text-sm muted">{f.d}</p></div>)}
      </section>
      <section className="container-x mt-14">
        <div className="card flex flex-col items-center gap-4 p-8 text-center sm:flex-row sm:text-left">
          <ShieldCheck className="h-12 w-12 shrink-0 text-wa-600" />
          <div className="flex-1"><h2 className="text-xl font-bold">Zéro commission, un abonnement simple</h2><p className="text-sm muted">Commencez avec l&apos;offre gratuite. Passez à Pro ou Business quand votre activité grandit.</p></div>
          <Link href="/tarifs" className="btn-dark"><Link2 className="h-4 w-4" />Voir les offres</Link>
        </div>
      </section>
    </SiteShell>
  );
}
