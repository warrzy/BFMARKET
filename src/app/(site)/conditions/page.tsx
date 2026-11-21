import { ContentPage } from "@/components/layout/ContentPage";

export const metadata = { title: "Conditions d'utilisation" };

export default function Terms() {
  return (
    <ContentPage title="Conditions d'utilisation" updated="21 novembre 2026" intro="Modèle à faire valider juridiquement avant mise en production.">
      <h2>Rôle d&apos;ECOM MARKET</h2>
      <p>ECOM MARKET est une plateforme technique mettant en relation acheteurs et vendeurs indépendants. Chaque vendeur est seul responsable de ses produits, de ses prix, de la livraison et du service après-vente. Sauf mention contraire, ECOM MARKET n&apos;est pas partie au contrat de vente et ne détient pas les fonds des ventes.</p>
      <h2>Obligations des vendeurs</h2>
      <ul><li>Fournir des informations exactes et des prix réels ; n&apos;afficher un prix barré que pour une promotion effective.</li><li>Ne proposer que des produits et services licites dans le pays concerné (sont notamment interdits : armes, médicaments sans autorisation, contrefaçons, produits volés).</li><li>Traiter les commandes avec diligence et respecter la politique de livraison et de retour affichée.</li><li>N&apos;utiliser les coordonnées des clients que pour le traitement de leurs commandes.</li></ul>
      <h2>Obligations des acheteurs</h2>
      <p>Fournir des coordonnées exactes, ne pas passer de commandes fictives, ne déclarer un paiement que s&apos;il a été réellement effectué.</p>
      <h2>Avis</h2>
      <p>Seuls les acheteurs dont la commande a été livrée peuvent publier un avis. Les avis injurieux ou trompeurs peuvent être masqués.</p>
      <h2>Abonnements</h2>
      <p>Les offres payantes sont facturées selon les tarifs affichés dans l&apos;espace vendeur pour le pays concerné. À l&apos;expiration, une période de grâce s&apos;applique, puis la boutique repasse à l&apos;offre gratuite.</p>
      <h2>Suspension</h2>
      <p>ECOM MARKET peut suspendre un compte ou une boutique en cas de manquement, de fraude ou de signalements fondés. Toutes les décisions de modération sont journalisées.</p>
    </ContentPage>
  );
}
