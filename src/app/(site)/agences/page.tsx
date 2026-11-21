import Link from "next/link";
import { ContentPage } from "@/components/layout/ContentPage";

export const metadata = { title: "Agences partenaires" };

export default function Agencies() {
  return (
    <ContentPage title="Réseau d'agences partenaires" intro="Agences, commerciaux et développeurs : accompagnez les commerçants dans la création de leur boutique.">
      <p>Un partenaire peut aider un vendeur à créer sa boutique, photographier ses produits et publier son catalogue. Les boutiques accompagnées sont rattachées au partenaire, qui perçoit une rémunération définie par contrat avec ECOM MARKET.</p>
      <h2>Comment devenir partenaire ?</h2>
      <p>Créez un compte, puis contactez l&apos;équipe via l&apos;assistance. Après signature du contrat, votre compte reçoit le rôle « Agent ».</p>
      <p><Link href="/inscription" className="btn-primary">Créer mon compte</Link></p>
    </ContentPage>
  );
}
