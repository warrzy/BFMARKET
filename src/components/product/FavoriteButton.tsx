"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toggleFavoriteAction } from "@/app/actions/account";

export function FavoriteButton({ productId, initial, label = "Favori" }: { productId: string; initial: boolean; label?: string }) {
  const [fav, setFav] = useState(initial);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button type="button" aria-pressed={fav} aria-label={label} disabled={pending}
      onClick={() => start(async () => { const r = await toggleFavoriteAction(productId); if (r.login) router.push("/connexion"); else if (r.ok) setFav(!!r.favorite); })}
      className="grid h-10 w-10 place-items-center rounded-xl border border-[rgb(var(--border))] hover:bg-[rgb(var(--surface-2))]">
      <Heart className={`h-5 w-5 ${fav ? "fill-brand-500 text-brand-500" : ""}`} />
    </button>
  );
}
