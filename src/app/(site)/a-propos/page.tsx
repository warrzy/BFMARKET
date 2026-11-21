import { ContentPage } from "@/components/layout/ContentPage";

export const metadata = { title: "À propos" };

export default function About() {
  return (
    <ContentPage title="À propos d'ECOM MARKET" intro="Une marketplace pensée pour les commerçants, artisans et entreprises d'Afrique de l'Ouest.">
      <h2>Notre mission</h2>
      <p>Donner à chaque commerçant une vitrine professionnelle en ligne, simple à gérer depuis un téléphone, et rapprocher acheteurs et vendeurs d&apos;une même ville, d&apos;un même pays et de toute la région.</p>
      <h2>Notre modèle</h2>
      <p>ECOM MARKET ne prélève aucune commission sur les ventes. La plateforme vit des abonnements optionnels (Pro, Business), de la mise en avant des boutiques et de services premium. Les paiements des commandes sont réglés directement entre client et vendeur, ou via un prestataire agréé lorsqu&apos;il est activé.</p>
      <h2>La confiance d&apos;abord</h2>
      <ul><li>Badge « Boutique vérifiée » attribué après contrôle par notre équipe.</li><li>Avis publiés uniquement par des clients ayant reçu leur commande.</li><li>Aucune commande n&apos;est marquée « payée » sans confirmation réelle du paiement.</li><li>Signalement des contenus et modération.</li></ul>
      <h2>Lancement</h2>
      <p>ECOM MARKET démarre au Burkina Faso et s&apos;ouvre progressivement aux autres pays d&apos;Afrique de l&apos;Ouest.</p>
    </ContentPage>
  );
}
