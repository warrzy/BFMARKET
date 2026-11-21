import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import { isAdmin } from "@/server/auth/guards";
import { DashShell } from "@/components/dashboard/DashShell";
import type { NavItem } from "@/components/dashboard/NavLinks";

export const metadata = { title: "Administration", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion?next=/admin");
  if (!isAdmin(user)) redirect("/");
  const scope = user.role === "COUNTRY_ADMIN" ? { countryCode: { in: user.adminCountries } } : {};
  const [pendingShops, pendingProducts, openReports, pendingPayments] = await Promise.all([
    db.shop.count({ where: { verification: "PENDING", ...scope } }),
    db.product.count({ where: { status: "PENDING_REVIEW", shop: scope } }),
    db.report.count({ where: { status: "OPEN" } }),
    db.transaction.count({ where: { purpose: "subscription", status: "PENDING" } }),
  ]);
  const superOnly = user.role === "SUPER_ADMIN";
  const nav: NavItem[] = [
    { href: "/admin", label: "Tableau de bord", icon: "LayoutDashboard", exact: true },
    { href: "/admin/boutiques", label: "Vendeurs & boutiques", icon: "Store", badge: pendingShops },
    { href: "/admin/produits", label: "Modération produits", icon: "Package", badge: pendingProducts },
    { href: "/admin/commandes", label: "Commandes", icon: "ShoppingBag" },
    { href: "/admin/utilisateurs", label: "Utilisateurs & rôles", icon: "Users" },
    { href: "/admin/categories", label: "Catégories", icon: "Tags" },
    { href: "/admin/pays", label: "Pays & villes", icon: "Globe" },
    { href: "/admin/abonnements", label: "Abonnements", icon: "Crown", badge: pendingPayments },
    { href: "/admin/paiements", label: "Paiements", icon: "CreditCard" },
    { href: "/admin/contenus", label: "Contenus & bannières", icon: "ImageIcon" },
    { href: "/admin/signalements", label: "Signalements & litiges", icon: "Flag", badge: openReports },
    { href: "/admin/support", label: "Support client", icon: "LifeBuoy" },
    { href: "/admin/journal", label: "Journal d'audit", icon: "ScrollText" },
    ...(superOnly ? [{ href: "/admin/parametres", label: "Paramètres globaux", icon: "Settings" } as NavItem] : []),
  ];
  return <DashShell nav={nav} title="Administration" subtitle={`${user.name} · ${user.role}${user.role === "COUNTRY_ADMIN" ? ` (${user.adminCountries.join(", ")})` : ""}`} externalHref="/" externalLabel="Voir le site">{children}</DashShell>;
}
