import Link from "next/link";
import { db } from "@/server/db";
import { requireShop } from "@/server/auth/guards";
import { getShopEntitlements } from "@/server/modules/subscriptions/service";
import { PageTitle } from "@/components/dashboard/DashShell";
import { StaffForm } from "@/components/seller/Forms";
import { removeStaffAction } from "@/app/actions/seller";
import { formatPhoneInternational } from "@/lib/phone";

export default async function Settings() {
  const { shop, user, memberRole } = await requireShop();
  const [ent, members] = await Promise.all([getShopEntitlements(shop.id), db.shopMember.findMany({ where: { shopId: shop.id }, include: { user: true } })]);
  return (
    <>
      <PageTitle title="Paramètres" />
      <section className="card mb-6 p-5 text-sm">
        <h2 className="mb-2 font-bold">Mon compte</h2>
        <p>{user.name} · {user.phone ? formatPhoneInternational(user.phone) : user.email} · rôle : {memberRole}</p>
        <Link href="/compte" className="mt-2 inline-block font-semibold text-brand-600">Gérer mon compte, exporter ou supprimer mes données</Link>
      </section>
      <section className="card p-5">
        <h2 className="mb-1 font-bold">Comptes collaborateurs</h2>
        <p className="mb-3 text-sm muted">Votre offre permet {ent.features.staffAccounts} collaborateur(s). Gérant : produits, commandes, paiements. Employé : produits et commandes.</p>
        <ul className="mb-4 divide-y divide-[rgb(var(--border))] text-sm">{members.map((m) => (
          <li key={m.userId} className="flex items-center justify-between py-2"><span>{m.user.name} <span className="muted">({m.role})</span></span>
            {m.role !== "OWNER" && memberRole === "OWNER" && <form action={removeStaffAction}><input type="hidden" name="userId" value={m.userId} /><button className="text-xs font-semibold text-red-600">Retirer</button></form>}</li>
        ))}</ul>
        {memberRole === "OWNER" && ent.features.staffAccounts > 0 && <StaffForm />}
        {ent.features.staffAccounts === 0 && <Link href="/vendeur/abonnement" className="text-sm font-semibold text-brand-600">Ajouter des collaborateurs avec l&apos;offre Pro ou Business</Link>}
      </section>
    </>
  );
}
