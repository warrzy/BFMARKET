"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgePercent, Boxes, ChartColumn, Crown, FileSpreadsheet, Flag, Globe, LayoutDashboard, LifeBuoy, Image as ImageIcon, CreditCard,
  Package, ScrollText, Settings, ShieldCheck, ShoppingBag, Store, Tags, Users, Wallet, Scale,
} from "lucide-react";

// Sous-ensemble explicite d'icônes (évite d'embarquer toute la bibliothèque côté client)
const ICONS = {
  BadgePercent, Boxes, ChartColumn, Crown, FileSpreadsheet, Flag, Globe, LayoutDashboard, LifeBuoy, ImageIcon, CreditCard,
  Package, ScrollText, Settings, ShieldCheck, ShoppingBag, Store, Tags, Users, Wallet, Scale,
};

export interface NavItem { href: string; label: string; icon: keyof typeof ICONS; exact?: boolean; badge?: number }

export function NavLinks({ items, compact = false }: { items: NavItem[]; compact?: boolean }) {
  const path = usePathname();
  return (
    <>
      {items.map((it) => {
        const active = it.exact ? path === it.href : path === it.href || path.startsWith(`${it.href}/`);
        const Icon = ICONS[it.icon];
        return compact ? (
          <Link key={it.href} href={it.href} className={`chip shrink-0 ${active ? "chip-active" : ""}`}>{it.label}{it.badge ? <span className="badge bg-brand-500 text-white">{it.badge}</span> : null}</Link>
        ) : (
          <Link key={it.href} href={it.href} className={`mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? "bg-brand-500 text-white shadow-sm shadow-brand-500/30" : "hover:bg-[rgb(var(--surface-2))]"}`}>
            <Icon className="h-4 w-4" />{it.label}
            {it.badge ? <span className={`badge ml-auto ${active ? "bg-white text-brand-600" : "bg-brand-500 text-white"}`}>{it.badge}</span> : null}
          </Link>
        );
      })}
    </>
  );
}
