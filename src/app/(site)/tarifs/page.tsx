import Link from "next/link";
import { Check } from "lucide-react";
import { db } from "@/server/db";
import { getLocation } from "@/server/location";
import { parseFeatures } from "@/server/modules/subscriptions/entitlements";
import { ContentPage } from "@/components/layout/ContentPage";
import { formatPrice } from "@/lib/money";

export const metadata = { title: "Offres et tarifs" };

export default async function PricingPage() {
  const loc = await getLocation();
  const country = loc.country ?? "BF";
  const plans = await db.plan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, include: { prices: { where: { countryCode: country } } } });
  const c = await db.country.findUnique({ where: { code: country } });
  return (
    <ContentPage title="Offres et tarifs" intro={`Tarifs pour ${c?.nameFr ?? country}. Aucune commission sur vos ventes, quelle que soit l'offre.`}>
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((p) => {
          const f = parseFeatures(p.features);
          const pr = p.prices[0];
          return (
            <div key={p.id} className={`card p-5 ${p.code === "PRO" ? "ring-2 ring-brand-500" : ""}`}>
              <h2 className="!mt-0 text-xl font-extrabold">{p.nameFr}</h2>
              <p className="text-sm">{p.descriptionFr}</p>
              <p className="mt-3 font-display text-3xl font-extrabold">{pr ? (pr.monthly ? formatPrice(pr.monthly, pr.currency) : "Gratuit") : "Bientôt"}{pr?.monthly ? <span className="text-sm font-normal muted"> / mois</span> : null}</p>
              {p.trialDays > 0 && <p className="text-xs font-semibold text-wa-600">{p.trialDays} jours d&apos;essai</p>}
              <ul className="mt-4 space-y-1.5 text-sm">
                <li className="!list-none flex gap-2"><Check className="h-4 w-4 text-wa-600" />{f.maxProducts == null ? "Produits illimités" : `${f.maxProducts} produits`}</li>
                {f.promotions && <li className="!list-none flex gap-2"><Check className="h-4 w-4 text-wa-600" />Promotions et codes promo</li>}
                {f.advancedStats && <li className="!list-none flex gap-2"><Check className="h-4 w-4 text-wa-600" />Statistiques avancées</li>}
                {f.ai && <li className="!list-none flex gap-2"><Check className="h-4 w-4 text-wa-600" />Assistant IA</li>}
                {f.import && <li className="!list-none flex gap-2"><Check className="h-4 w-4 text-wa-600" />Import CSV / Excel</li>}
                {f.staffAccounts > 0 && <li className="!list-none flex gap-2"><Check className="h-4 w-4 text-wa-600" />{f.staffAccounts} collaborateur(s)</li>}
                {f.featured && <li className="!list-none flex gap-2"><Check className="h-4 w-4 text-wa-600" />Visibilité renforcée</li>}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="text-center"><Link href="/ouvrir-boutique" className="btn-primary">Commencer gratuitement</Link></p>
    </ContentPage>
  );
}
