import { ContentPage } from "@/components/layout/ContentPage";

export const metadata = { title: "Mentions légales" };

export default function Legal() {
  return (
    <ContentPage title="Mentions légales" intro="À compléter avec les informations de la société éditrice avant la mise en production.">
      <h2>Éditeur</h2>
      <p>[Raison sociale] — [forme juridique] au capital de [montant] — RCCM [numéro] — IFU [numéro] — Siège : [adresse], Ouagadougou, Burkina Faso — Directeur de la publication : [nom].</p>
      <h2>Hébergement</h2>
      <p>[Nom de l&apos;hébergeur, adresse].</p>
      <h2>Contact</h2>
      <p>Support : via le bouton WhatsApp du site ou la rubrique Assistance de l&apos;espace vendeur.</p>
    </ContentPage>
  );
}
