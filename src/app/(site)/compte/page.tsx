import Link from "next/link";
import { Bell, Download, Package } from "lucide-react";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth/guards";
import { SiteShell } from "@/components/layout/SiteShell";
import { DeleteAccountForm } from "@/components/account/AccountForms";
import { logoutAction } from "@/app/actions/auth";
import { markNotificationsReadAction } from "@/app/actions/account";
import { formatPrice } from "@/lib/money";
import { formatPhoneInternational } from "@/lib/phone";
import fr from "@/i18n/fr";

export const metadata = { title: "Mon compte", robots: { index: false } };

export default async function AccountPage() {
  const user = await requireUser("/compte");
  const [orders, notifications, shop] = await Promise.all([
    db.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20, include: { subOrders: { include: { shop: { select: { name: true } } } } } }),
    db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 15 }),
    db.shopMember.findFirst({ where: { userId: user.id } }),
  ]);
  return (
    <SiteShell>
      <div className="container-x max-w-4xl space-y-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h1 className="text-3xl font-extrabold">Bonjour {user.name.split(" ")[0]}</h1><p className="text-sm muted">{user.phone ? formatPhoneInternational(user.phone) : user.email}</p></div>
          <div className="flex gap-2">{shop ? <Link href="/vendeur" className="btn-dark">Espace vendeur</Link> : <Link href="/ouvrir-boutique" className="btn-primary">Ouvrir ma boutique</Link>}
            <form action={logoutAction}><button className="btn-ghost">Déconnexion</button></form></div>
        </div>
        <section className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-bold"><Package className="h-5 w-5" />Mes commandes</h2>
          {orders.length === 0 ? <p className="text-sm muted">Aucune commande.</p> : (
            <ul className="divide-y divide-[rgb(var(--border))]">{orders.map((o) => (
              <li key={o.id}><Link href={`/commande/suivi/${o.trackingToken}`} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span><b>{o.reference}</b> <span className="muted">· {o.createdAt.toLocaleDateString("fr-FR")} · {o.subOrders.map((s) => s.shop.name).join(", ")}</span></span>
                <span className="flex gap-2">{o.subOrders.map((s) => <span key={s.id} className="badge bg-[rgb(var(--surface-2))]">{fr.status[s.status]} · {formatPrice(s.total, s.currency)}</span>)}</span>
              </Link></li>
            ))}</ul>
          )}
        </section>
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 font-bold"><Bell className="h-5 w-5" />Notifications</h2>
            <form action={markNotificationsReadAction}><button className="text-xs font-semibold text-brand-600">Tout marquer comme lu</button></form></div>
          {notifications.length === 0 ? <p className="text-sm muted">Rien de nouveau.</p> : (
            <ul className="space-y-2 text-sm">{notifications.map((n) => <li key={n.id} className={n.readAt ? "muted" : ""}><Link href={n.href ?? "#"}><b>{n.title}</b> — {n.body}</Link></li>)}</ul>
          )}
        </section>
        <section className="card space-y-4 p-5">
          <h2 className="font-bold">Mes données personnelles</h2>
          <p className="text-sm muted">Vous pouvez télécharger une copie de vos données ou supprimer votre compte. Voir la <Link href="/confidentialite" className="underline">politique de confidentialité</Link>.</p>
          <a href="/api/compte/export" className="btn-ghost"><Download className="h-4 w-4" />Exporter mes données (JSON)</a>
          <details><summary className="cursor-pointer text-sm font-semibold text-red-600">Supprimer mon compte</summary>
            <p className="my-2 text-sm muted">Vos données personnelles seront anonymisées et vos boutiques fermées. Cette action est irréversible.</p><DeleteAccountForm /></details>
        </section>
      </div>
    </SiteShell>
  );
}
