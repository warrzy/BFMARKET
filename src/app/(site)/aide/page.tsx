import { ContentPage } from "@/components/layout/ContentPage";

export const metadata = { title: "Centre d'aide" };

const FAQ: [string, string][] = [
  ["Comment commander ?", "Ajoutez les produits au panier, renseignez votre téléphone, votre ville, votre quartier et un point de repère, choisissez la livraison et le mode de paiement. Chaque vendeur vous contacte pour confirmer. Vous pouvez aussi commander directement via WhatsApp depuis la fiche produit."],
  ["Comment suivre ma commande ?", "Après la commande, vous recevez un lien de suivi personnel. Si vous avez un compte, vos commandes apparaissent dans « Mon compte »."],
  ["Comment payer ?", "Selon le vendeur et votre pays : paiement à la livraison, paiement direct au vendeur (Mobile Money, espèces), virement avec validation, ou paiement en ligne quand il est disponible. Une commande n'est marquée « payée » qu'après confirmation par le vendeur ou le prestataire de paiement."],
  ["Comment ouvrir une boutique ?", "Cliquez sur « Ouvrir ma boutique », créez votre compte avec votre téléphone, confirmez le code reçu, puis renseignez le nom de la boutique, votre ville et votre WhatsApp. Ajoutez un premier produit : votre boutique est en ligne."],
  ["Combien ça coûte ?", "L'offre gratuite permet de démarrer. Les offres Pro et Business ajoutent plus de produits, des promotions, des statistiques avancées, l'import de catalogue et l'assistant IA. Aucune commission n'est prélevée sur vos ventes."],
  ["Comment obtenir le badge « Boutique vérifiée » ?", "Depuis votre espace vendeur, rubrique « Ma boutique », demandez la vérification. L'équipe contrôle votre identité et votre activité avant d'attribuer le badge."],
  ["Un produit me semble frauduleux", "Utilisez le lien « Signaler » sous le produit ou la boutique. Notre équipe de modération examine chaque signalement."],
];

export default function Help() {
  return (
    <ContentPage title="Centre d'aide" intro="Les réponses aux questions les plus fréquentes.">
      <div className="space-y-3">{FAQ.map(([q, a]) => <details key={q} className="card p-4"><summary className="cursor-pointer font-semibold">{q}</summary><p className="mt-2 text-sm">{a}</p></details>)}</div>
    </ContentPage>
  );
}
