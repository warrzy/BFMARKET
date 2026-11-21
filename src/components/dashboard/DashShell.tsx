import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { logoutAction } from "@/app/actions/auth";
import { NavLinks, type NavItem } from "./NavLinks";

export function DashShell({ nav, title, subtitle, children, externalHref, externalLabel }: {
  nav: NavItem[]; title: string; subtitle?: string; children: React.ReactNode; externalHref?: string; externalLabel?: string;
}) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-[rgb(var(--border))] bg-[rgb(var(--surface))] lg:flex">
        <div className="p-5"><Logo /></div>
        <div className="px-5 pb-3"><p className="truncate text-sm font-bold">{title}</p>{subtitle && <p className="truncate text-xs muted">{subtitle}</p>}</div>
        <nav className="flex-1 overflow-y-auto px-3"><NavLinks items={nav} /></nav>
        <div className="flex items-center gap-1 border-t border-[rgb(var(--border))] p-3">
          {externalHref && <Link href={externalHref} target="_blank" className="btn-ghost flex-1 text-xs"><ExternalLink className="h-3.5 w-3.5" />{externalLabel}</Link>}
          <ThemeToggle />
          <form action={logoutAction}><button className="grid h-10 w-10 place-items-center rounded-xl hover:bg-[rgb(var(--surface-2))]" aria-label="Déconnexion"><LogOut className="h-4 w-4" /></button></form>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-[rgb(var(--border))] bg-[rgb(var(--surface))]/90 px-4 py-3 backdrop-blur lg:hidden">
          <Logo />
          <div className="ml-auto flex items-center">
            {externalHref && <Link href={externalHref} className="grid h-10 w-10 place-items-center" aria-label={externalLabel}><ExternalLink className="h-4 w-4" /></Link>}
            <ThemeToggle />
            <form action={logoutAction}><button className="grid h-10 w-10 place-items-center" aria-label="Déconnexion"><LogOut className="h-4 w-4" /></button></form>
          </div>
        </header>
        <nav className="scroll-row sticky top-[65px] z-20 border-b border-[rgb(var(--border))] bg-[rgb(var(--bg))]/95 px-4 py-2 backdrop-blur lg:hidden"><NavLinks items={nav} compact /></nav>
        <main className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export function PageTitle({ title, children, subtitle }: { title: string; children?: React.ReactNode; subtitle?: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-extrabold">{title}</h1>{subtitle && <p className="mt-1 text-sm muted">{subtitle}</p>}</div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, accent }: { label: string; value: React.ReactNode; hint?: React.ReactNode; accent?: "brand" | "green" | "gold" | "night" }) {
  const bar = { brand: "bg-brand-500", green: "bg-wa-500", gold: "bg-gold-500", night: "bg-night-500" }[accent ?? "night"];
  return (
    <div className="card relative overflow-hidden p-4">
      <span className={`absolute inset-y-0 left-0 w-1 ${bar}`} />
      <p className="text-xs font-medium muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-extrabold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs muted">{hint}</p>}
    </div>
  );
}
