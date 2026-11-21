"use client";

import Link from "next/link";
import { useTransition } from "react";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { setLocaleAction } from "@/app/actions/prefs";

export function CartButton({ label }: { label: string }) {
  const { count, ready } = useCart();
  return (
    <Link href="/panier" aria-label={label} className="relative grid h-10 w-10 place-items-center rounded-xl hover:bg-[rgb(var(--surface-2))]">
      <ShoppingBag className="h-5 w-5" />
      {ready && count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white">{count > 99 ? "99+" : count}</span>
      )}
    </Link>
  );
}

export function CartCount() {
  const { count, ready } = useCart();
  if (!ready || count === 0) return null;
  return <span className="absolute right-3 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand-500 px-1 text-[9px] font-bold text-white">{count}</span>;
}

export function LangSwitch({ locale }: { locale: string }) {
  const [pending, start] = useTransition();
  const next = locale === "fr" ? "en" : "fr";
  return (
    <button type="button" disabled={pending} onClick={() => start(() => setLocaleAction(next))}
      className="grid h-10 w-10 place-items-center rounded-xl text-xs font-bold hover:bg-[rgb(var(--surface-2))]" aria-label={next === "en" ? "English" : "Français"}>
      {next.toUpperCase()}
    </button>
  );
}
