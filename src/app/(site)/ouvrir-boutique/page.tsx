import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, Rocket } from "lucide-react";
import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import { getActiveCountries, getLocation } from "@/server/location";
import { SiteShell } from "@/components/layout/SiteShell";
import { InfoStep, ProductStep, SkipProductStep, VisualsStep } from "@/components/seller/OnboardingForms";
import { onboardingOpenAction } from "@/app/actions/onboarding";
import { absoluteUrl } from "@/lib/utils";

export const metadata = { title: "Ouvrir ma boutique" };

const STEPS = ["Compte", "Vérification", "Boutique", "Visuels", "1er produit", "Ouverture"];

export default async function OpenShopPage() {
  const user = await getCurrentUser();
  const membership = user ? await db.shopMember.findFirst({ where: { userId: user.id, role: "OWNER" }, include: { shop: { include: { country: true, _count: { select: { products: true } } } } } }) : null;
  const shop = membership?.shop;
  if (shop && shop.status !== "DRAFT") redirect("/vendeur");
  const step = !user ? 1 : !user.verifiedAt ? 2 : shop ? Math.min(shop.onboardingStep, 6) : 3;
  if (step === 2) redirect("/verification?next=/ouvrir-boutique");

  const [countries, loc, categories] = await Promise.all([
    getActiveCountries(), getLocation(),
    db.category.findMany({ where: { active: true, parentId: null }, orderBy: { sortOrder: "asc" }, select: { id: true, nameFr: true } }),
  ]);

  return (
    <SiteShell>
      <div className="container-x max-w-2xl py-8">
        <ol className="mb-8 grid grid-cols-6 gap-1.5" aria-label="Étapes">
          {STEPS.map((s, i) => (
            <li key={s} className="text-center">
              <div className={`mx-auto grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${i + 1 < step ? "bg-wa-500 text-white" : i + 1 === step ? "bg-brand-500 text-white ring-4 ring-brand-500/20" : "bg-[rgb(var(--surface-2))] muted"}`}>
                {i + 1 < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <p className="mt-1 hidden text-[11px] sm:block">{s}</p>
            </li>
          ))}
        </ol>

        <div className="card p-6 sm:p-8">
          {step === 1 && (
            <div className="text-center">
              <Rocket className="mx-auto h-12 w-12 text-brand-500" />
              <h1 className="mt-4 text-3xl font-extrabold">Votre boutique en ligne en 5 minutes</h1>
              <p className="mt-3 muted">Gratuit. Sans carte bancaire. Depuis votre téléphone. Vous gardez 100 % de vos ventes.</p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link href="/inscription?vendeur=1" className="btn-primary px-6 py-3">Créer mon compte vendeur</Link>
                <Link href="/connexion?next=/ouvrir-boutique" className="btn-ghost px-6 py-3">J&apos;ai déjà un compte</Link>
              </div>
            </div>
          )}
          {step === 3 && (
            <>
              <h1 className="text-2xl font-extrabold">Présentez votre boutique</h1>
              <p className="mb-6 mt-1 text-sm muted">Ces informations permettent aux clients de votre ville de vous trouver.</p>
              <InfoStep
                countries={countries.map((c) => ({ code: c.code, name: c.nameFr, flag: c.flag, dial: c.dialCode, cities: c.cities.map((x) => ({ id: x.id, name: x.name })) }))}
                initial={{ name: shop?.name, country: shop?.countryCode ?? loc.country ?? "BF", cityId: shop?.cityId ?? loc.cityId, sector: shop?.sector ?? undefined }}
              />
            </>
          )}
          {step === 4 && (<><h1 className="text-2xl font-extrabold">Logo et couverture</h1><p className="mb-6 mt-1 text-sm muted">Une boutique avec un logo inspire davantage confiance.</p><VisualsStep /></>)}
          {step === 5 && shop && (<><h1 className="text-2xl font-extrabold">Publiez votre premier produit</h1><p className="mb-6 mt-1 text-sm muted">Une photo nette, un prix clair : c&apos;est tout ce qu&apos;il faut pour commencer.</p><ProductStep currency={shop.country.currency} categories={categories.map((c) => ({ id: c.id, name: c.nameFr }))} /><SkipProductStep /></>)}
          {step === 6 && shop && (
            <div className="text-center">
              <h1 className="text-2xl font-extrabold">Tout est prêt, {shop.name} !</h1>
              <p className="mt-2 muted">Votre adresse de boutique :</p>
              <p className="mt-2 break-all rounded-xl bg-[rgb(var(--surface-2))] p-3 font-mono text-sm">{absoluteUrl(`/boutique/${shop.slug}`)}</p>
              <p className="mt-3 text-sm muted">{shop._count.products} produit(s) publié(s). En ouvrant votre boutique, vous acceptez les conditions vendeur (produits licites, informations exactes).</p>
              <form action={onboardingOpenAction} className="mt-6"><button className="btn-primary px-8 py-3.5 text-base"><Rocket className="h-5 w-5" />Ouvrir ma boutique</button></form>
            </div>
          )}
        </div>
      </div>
    </SiteShell>
  );
}
