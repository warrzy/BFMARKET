import Link from "next/link";
import { AlertTriangle, ArrowRight, Copy, PartyPopper, Plus } from "lucide-react";
import { db } from "@/server/db";
import { requireShop } from "@/server/auth/guards";
import { shopFinancials } from "@/server/modules/orders/service";
import { getShopEntitlements } from "@/server/modules/subscriptions/service";
import { shopDailySeries, topProducts } from "@/server/modules/shops/stats";
import { PageTitle, Stat } from "@/components/dashboard/DashShell";
import { Bars } from "@/components/dashboard/Bars";
import { formatPrice } from "@/lib/money";
import { absoluteUrl } from "@/lib/utils";
import { waShareLink } from "@/lib/whatsapp";
import { StatusBadge, PaymentBadge } from "@/components/dashboard/Badges";

export default async function SellerHome({ searchParams }: { searchParams: Promise<{ bienvenue?: string }> }) {
  const { shop } = await requireShop();
  const welcome = (await searchParams).bienvenue === "1";
  const since = new Date(Date.now() - 30 * 86400_000);
  const cur = shop.country.currency;
  const [fin, ent, series, top, activeProducts, recent, lowStock, unread] = await Promise.all([
    shopFinancials(shop.id, since), getShopEntitlements(shop.id), shopDailySeries(shop.id, 30), topProducts(shop.id),
    db.product.count({ where: { shopId: shop.id, status: "ACTIVE", deletedAt: null } }),
    db.subOrder.findMany({ where: { shopId: shop.id }, orderBy: { createdAt: "desc" }, take: 6, include: { order: true } }),
    db.product.count({ where: { shopId: shop.id, deletedAt: null, stock: { lte: 3 } } }),
    db.notification.findMany({ where: { user: { shops: { some: { shopId: shop.id } } }, readAt: null }, take: 5, orderBy: { createdAt: "desc" } }),
  ]);
  const visits = series.reduce((s, d) => s + d.visits, 0);
  const url = absoluteUrl(`/boutique/${shop.slug}`);
  const max = ent.features.maxProducts;

  return (
    <>
      {welcome && (
        <div className="card mb-6 flex items-start gap-3 border-brand-300 bg-gradient-to-r from-brand-50 to-transparent p-5 dark:from-brand-500/10">
          <PartyPopper className="h-7 w-7 shrink-0 text-brand-500" />
          <div className="flex-1"><p className="text-lg font-bold">Votre boutique est en ligne !</p><p className="text-sm muted">Partagez votre lien sur WhatsApp, Facebook et TikTok pour recevoir vos premières commandes.</p>
            <a href={waShareLink(`Découvrez ma boutique ${shop.name} sur ECOM MARKET 👉 ${url}`)} target="_blank" rel="noopener noreferrer" className="btn-wa mt-3">Partager sur WhatsApp</a></div>
        </div>
      )}
      <PageTitle title={`Bonjour 👋`} subtitle={`Activité des 30 derniers jours · offre ${ent.planCode}`}>
        <Link href="/vendeur/produits/nouveau" className="btn-primary"><Plus className="h-4 w-4" />Ajouter un produit</Link>
      </PageTitle>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Commandes reçues" value={fin.ordersCount} hint={`${formatPrice(fin.ordersValue, cur)} enregistrés`} accent="night" />
        <Stat label="En attente de confirmation" value={fin.pendingCount} hint={<Link href="/vendeur/commandes?status=PENDING" className="underline">Traiter</Link>} accent="brand" />
        <Stat label="Montant encaissé (vérifié)" value={formatPrice(fin.paidValue, cur)} hint={`${fin.paidCount} commande(s) payée(s)`} accent="green" />
        <Stat label="Paiements déclarés (à vérifier)" value={formatPrice(fin.declaredValue, cur)} hint={`${fin.declaredCount} déclaration(s)`} accent="gold" />
        <Stat label="Produits actifs" value={max ? `${activeProducts} / ${max}` : activeProducts} hint={lowStock ? `${lowStock} en stock faible` : "Stocks OK"} />
        <Stat label="Visites de la boutique" value={visits} hint="30 derniers jours" />
        <Stat label="Taux de conversion" value={visits ? `${((fin.ordersCount / visits) * 100).toFixed(1)} %` : "—"} hint="commandes / visites" />
        <Stat label="Abonnement" value={ent.planCode} hint={ent.subscription?.currentPeriodEnd ? `jusqu'au ${ent.subscription.currentPeriodEnd.toLocaleDateString("fr-FR")}` : <Link href="/vendeur/abonnement" className="underline">Voir les offres</Link>} accent="gold" />
      </div>
      <p className="mt-2 text-xs muted">« Encaissé » = paiements confirmés par vous ou par un prestataire. « Déclaré » = le client indique avoir payé, non encore vérifié. Les commandes ne sont jamais marquées payées automatiquement.</p>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2"><h2 className="mb-4 font-bold">Visites par jour</h2><Bars data={series.map((d) => ({ key: d.key, label: d.label, value: d.visits }))} label="Visites quotidiennes" /></div>
        <div className="card p-5">
          <h2 className="mb-3 font-bold">Votre lien boutique</h2>
          <p className="break-all rounded-xl bg-[rgb(var(--surface-2))] p-3 font-mono text-xs">{url}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <a href={waShareLink(`🛍️ ${shop.name} — commandez en ligne : ${url}`)} target="_blank" rel="noopener noreferrer" className="btn-wa text-xs">WhatsApp</a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" className="btn-ghost text-xs">Facebook</a>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/qr?path=/boutique/${shop.slug}`} alt="QR code de la boutique" className="mx-auto mt-3 h-32 w-32 rounded-lg bg-white p-1" />
          <a href={`/api/qr?path=/boutique/${shop.slug}`} download={`qr-${shop.slug}.svg`} className="mt-2 flex items-center justify-center gap-1 text-xs font-semibold text-brand-600"><Copy className="h-3 w-3" />Télécharger le QR code</a>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Dernières commandes</h2><Link href="/vendeur/commandes" className="text-sm font-semibold text-brand-600">Tout voir</Link></div>
          {recent.length === 0 ? <p className="text-sm muted">Aucune commande pour le moment. Partagez votre boutique !</p> : (
            <ul className="divide-y divide-[rgb(var(--border))]">{recent.map((s) => (
              <li key={s.id}><Link href={`/vendeur/commandes/${s.id}`} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0"><span className="block truncate font-medium">{s.order.buyerName}</span><span className="text-xs muted">{s.reference}</span></span>
                <span className="flex shrink-0 flex-col items-end gap-1"><span className="font-semibold">{formatPrice(s.total, s.currency)}</span><span className="flex gap-1"><StatusBadge s={s.status} /><PaymentBadge s={s.paymentStatus} /></span></span>
              </Link></li>
            ))}</ul>
          )}
        </div>
        <div className="card p-5">
          <h2 className="mb-3 font-bold">Produits populaires</h2>
          {top.length === 0 ? <p className="text-sm muted">Les produits les plus commandés apparaîtront ici.</p> : (
            <ul className="space-y-2 text-sm">{top.map((p) => <li key={p.id} className="flex justify-between gap-3"><Link href={`/produit/${p.slug}`} className="truncate hover:underline">{p.title}</Link><span className="shrink-0 muted">{p.sold} vendus · {p.viewCount} vues</span></li>)}</ul>
          )}
          {unread.length > 0 && (<><h2 className="mb-2 mt-5 font-bold">Notifications</h2><ul className="space-y-1.5 text-sm">{unread.map((n) => <li key={n.id}><Link href={n.href ?? "#"} className="hover:underline"><b>{n.title}</b> — <span className="muted">{n.body}</span></Link></li>)}</ul></>)}
        </div>
      </div>

      {ent.subscription?.status === "PAST_DUE" && (
        <Link href="/vendeur/abonnement" className="card mt-6 flex items-center gap-3 border-gold-500 p-4"><AlertTriangle className="h-5 w-5 text-gold-500" /><span className="flex-1 text-sm">Votre abonnement a expiré : vos avantages restent actifs quelques jours. Renouvelez maintenant.</span><ArrowRight className="h-4 w-4" /></Link>
      )}
    </>
  );
}
