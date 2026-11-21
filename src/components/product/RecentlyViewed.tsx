"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Seen { slug: string; title: string; image?: string | null; price: string }
const KEY = "em_seen_v1";

export function trackSeen(item: Seen) {
  try {
    const list: Seen[] = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    localStorage.setItem(KEY, JSON.stringify([item, ...list.filter((x) => x.slug !== item.slug)].slice(0, 12)));
  } catch {}
}

export function TrackSeen(props: Seen) {
  useEffect(() => trackSeen(props), [props]);
  return null;
}

export function RecentlyViewed({ title }: { title: string }) {
  const [items, setItems] = useState<Seen[]>([]);
  useEffect(() => {
    try { setItems(JSON.parse(localStorage.getItem(KEY) ?? "[]")); } catch {}
  }, []);
  if (items.length < 2) return null;
  return (
    <section className="container-x mt-10">
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      <div className="scroll-row">
        {items.map((it) => (
          <Link key={it.slug} href={`/produit/${it.slug}`} className="card flex w-56 shrink-0 items-center gap-3 p-2">
            {it.image && <Image src={it.image} alt="" width={56} height={56} className="h-14 w-14 rounded-lg object-cover" />}
            <div className="min-w-0"><p className="truncate text-sm font-medium">{it.title}</p><p className="text-sm font-bold">{it.price}</p></div>
          </Link>
        ))}
      </div>
    </section>
  );
}
