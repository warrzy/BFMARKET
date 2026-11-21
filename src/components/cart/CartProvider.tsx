"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

// Panier côté client (localStorage) — seules les références sont envoyées au serveur,
// qui recalcule prix, stocks et disponibilités au moment de la commande.
export interface CartLine {
  productId: string;
  variantId?: string | null;
  quantity: number;
  // instantané d'affichage (non fiable, recalculé côté serveur)
  title: string;
  variantName?: string | null;
  unitPrice: number;
  currency: string;
  image?: string | null;
  slug: string;
  shopId: string;
  shopName: string;
}

interface CartCtx {
  lines: CartLine[];
  count: number;
  add: (line: CartLine) => void;
  setQty: (productId: string, variantId: string | null | undefined, qty: number) => void;
  remove: (productId: string, variantId?: string | null) => void;
  clear: () => void;
  ready: boolean;
}

const Ctx = createContext<CartCtx | null>(null);
const KEY = "em_cart_v1";
const same = (a: { productId: string; variantId?: string | null }, b: { productId: string; variantId?: string | null }) =>
  a.productId === b.productId && (a.variantId ?? null) === (b.variantId ?? null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {}
  }, [lines, ready]);

  const add = useCallback((line: CartLine) => {
    setLines((prev) => {
      const i = prev.findIndex((l) => same(l, line));
      if (i === -1) return [...prev, line];
      const next = [...prev];
      next[i] = { ...next[i], quantity: Math.min(999, next[i].quantity + line.quantity) };
      return next;
    });
  }, []);
  const setQty = useCallback((productId: string, variantId: string | null | undefined, qty: number) => {
    setLines((prev) => prev.map((l) => (same(l, { productId, variantId }) ? { ...l, quantity: Math.max(1, Math.min(999, qty)) } : l)));
  }, []);
  const remove = useCallback((productId: string, variantId?: string | null) => {
    setLines((prev) => prev.filter((l) => !same(l, { productId, variantId })));
  }, []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(
    () => ({ lines, count: lines.reduce((s, l) => s + l.quantity, 0), add, setQty, remove, clear, ready }),
    [lines, add, setQty, remove, clear, ready],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart hors CartProvider");
  return c;
}
