"use client";

import { useState } from "react";
import { Check, Facebook, Link2, Share2 } from "lucide-react";
import { WhatsAppIcon } from "@/components/layout/WhatsAppFab";

export function ShareBar({ url, text, label = "Partager" }: { url: string; text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent;
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };
  const native = async () => {
    if (navigator.share) { try { await navigator.share({ url, text }); } catch {} } else copy();
  };
  const cls = "grid h-10 w-10 place-items-center rounded-xl border border-[rgb(var(--border))] hover:bg-[rgb(var(--surface-2))]";
  return (
    <div className="flex items-center gap-2">
      <span className="mr-1 text-sm font-medium muted">{label}</span>
      <a className={`${cls} text-wa-600`} href={`https://wa.me/?text=${enc(`${text}\n${url}`)}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><WhatsAppIcon className="h-5 w-5" /></a>
      <a className={`${cls} text-[#1877F2]`} href={`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`} target="_blank" rel="noopener noreferrer" aria-label="Facebook"><Facebook className="h-5 w-5" /></a>
      {/* TikTok n'a pas d'URL de partage web : on copie le lien à coller dans la bio ou la vidéo */}
      <button className={cls} onClick={copy} aria-label="TikTok (copier le lien)" title="TikTok : copier le lien">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden><path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 1 1-2.59-2.6c.27 0 .53.04.77.12V9.77a5.7 5.7 0 0 0-.77-.05 5.69 5.69 0 1 0 5.69 5.69V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.28 4.28 0 0 1-3.25-1.48z" /></svg>
      </button>
      <button className={cls} onClick={copy} aria-label="Copier le lien">{copied ? <Check className="h-5 w-5 text-wa-600" /> : <Link2 className="h-5 w-5" />}</button>
      <button className={`${cls} sm:hidden`} onClick={native} aria-label={label}><Share2 className="h-5 w-5" /></button>
    </div>
  );
}
