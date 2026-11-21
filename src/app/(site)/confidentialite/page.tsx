import { ContentPage } from "@/components/layout/ContentPage";

export const metadata = { title: "Politique de confidentialité" };

export default function Privacy() {
  return (
    <ContentPage title="Politique de confidentialité" updated="21 novembre 2026" intro="Ce modèle doit être validé par un conseil juridique au regard des lois applicables dans chaque pays (au Burkina Faso, loi n°001-2021/AN relative à la protection des données à caractère personnel, sous le contrôle de la CIL ; et équivalents régionaux).">
      <h2>Données collectées</h2>
      <ul><li>Compte : nom, téléphone et/ou e-mail, pays, mot de passe (chiffré, jamais stocké en clair).</li><li>Commandes : coordonnées de livraison (ville, quartier, point de repère), contenu de la commande.</li><li>Boutiques : informations publiques de la boutique et de ses produits.</li><li>Statistiques : nombre de visites agrégé par jour, sans profilage individuel.</li></ul>
      <h2>Finalités</h2>
      <p>Création et sécurisation des comptes, traitement des commandes par les vendeurs concernés, gestion des abonnements, modération, prévention de la fraude et obligations légales.</p>
      <h2>Partage</h2>
      <p>Les coordonnées d&apos;une commande sont transmises uniquement au(x) vendeur(s) concerné(s). Aucune donnée n&apos;est vendue. Les prestataires techniques (hébergement, envoi de SMS, paiement) agissent sur instruction.</p>
      <h2>Géolocalisation</h2>
      <p>La position n&apos;est demandée qu&apos;avec votre accord explicite, pour suggérer votre ville ; elle n&apos;est pas conservée.</p>
      <h2>Vos droits</h2>
      <p>Depuis « Mon compte », vous pouvez exporter vos données (JSON) et supprimer votre compte. Pour toute autre demande (rectification, opposition), contactez le support.</p>
      <h2>Conservation</h2>
      <p>Les données de compte sont conservées tant que le compte est actif. À la suppression, les données personnelles sont anonymisées ; les commandes sont conservées sans données identifiantes pour les obligations comptables.</p>
      <h2>Cookies</h2>
      <p>Seuls des cookies nécessaires sont utilisés : session, langue, localisation choisie. Le panier et l&apos;historique « vu récemment » sont stockés dans votre navigateur.</p>
    </ContentPage>
  );
}
