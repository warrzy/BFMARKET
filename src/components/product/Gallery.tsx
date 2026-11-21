"use client";

import Image from "next/image";
import { useState } from "react";

export function Gallery({ images, video, title }: { images: { url: string; alt?: string | null }[]; video?: string | null; title: string }) {
  const media = [...images.map((i) => ({ type: "img" as const, url: i.url, alt: i.alt ?? title })), ...(video ? [{ type: "video" as const, url: video, alt: title }] : [])];
  const [i, setI] = useState(0);
  const cur = media[i];
  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-3xl bg-[rgb(var(--surface-2))]">
        {cur?.type === "img" && <Image src={cur.url} alt={cur.alt} fill priority sizes="(max-width: 1024px) 100vw, 600px" className="object-cover" />}
        {cur?.type === "video" && <video src={cur.url} controls playsInline className="h-full w-full object-contain bg-black" preload="metadata" />}
        {!cur && <div className="grid h-full place-items-center muted">Photo à venir</div>}
      </div>
      {media.length > 1 && (
        <div className="scroll-row mt-3">
          {media.map((m, k) => (
            <button key={k} onClick={() => setI(k)} aria-label={`Média ${k + 1}`}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 ${k === i ? "border-brand-500" : "border-transparent"}`}>
              {m.type === "img" ? <Image src={m.url} alt="" fill sizes="64px" className="object-cover" /> : <span className="grid h-full place-items-center bg-night-900 text-xs text-white">▶ Vidéo</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
