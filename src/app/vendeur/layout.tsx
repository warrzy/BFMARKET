import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { requireShop } from "@/server/auth/guards";
import { DashShell } from "@/components/dashboard/DashShell";
import type { NavItem } from "@/components/dashboard/NavLinks";

export const metadata = { title: "Espace vendeur", robots: { index: false } };

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const { shop } = await requireShop();
  if (shop.status === "DRAFT") redirect("/ouvrir-boutique");
  const pending = await db.subOrder.count({ where: { shopId: shop.id, status: "PENDING" } });
  const nav: NavItem[] = [
    { href: "/vendeur", label: "Vue d'ensemble", icon: "LayoutDashboard", exact: true },
    { href: "/vendeur/boutique", label: "Ma boutique", icon: "Store" },
    { href: "/vendeur/produits", label: "Mes produits", icon: "Package" },
    { href: "/vendeur/commandes", label: "Mes commandes", icon: "ShoppingBag", badge: pending },
    { href: "/vendeur/clients", label: "Clients", icon: "Users" },
    { href: "/vendeur/stocks", label: "Stocks", icon: "Boxes" },
    { href: "/vendeur/promotions", label: "Promotions", icon: "BadgePercent" },
    { href: "/vendeur/statistiques", label: "Statistiques", icon: "ChartColumn" },
    { href: "/vendeur/paiements", label: "Paiements", icon: "Wallet" },
    { href: "/vendeur/abonnement", label: "Abonnement", icon: "Crown" },
    { href: "/vendeur/import", label: "Import / export", icon: "FileSpreadsheet" },
    { href: "/vendeur/parametres", label: "Paramètres", icon: "Settings" },
    { href: "/vendeur/assistance", label: "Assistance", icon: "LifeBuoy" },
  ];
  return (
    <DashShell nav={nav} title={shop.name} subtitle={`${shop.city?.name ?? ""} ${shop.country.flag}`} externalHref={`/boutique/${shop.slug}`} externalLabel="Voir ma boutique">
      {children}
    </DashShell>
  );
}
