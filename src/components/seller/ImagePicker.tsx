"use client";

import { useState } from "react";
import { ImagePlus } from "lucide-react";

/** Sélecteur d'images avec aperçu. La compression réelle est faite côté serveur (WebP). */
export function ImagePicker({ name, label, aspect = "square", multiple = false, existing = [] }: { name: string; label: string; aspect?: "square" | "wide"; multiple?: boolean; existing?: string[] }) {
  const [previews, setPreviews] = useState<string[]>(existing);
  const [error, setError] = useState("");
  return (
    <div>
      <span className="label">{label}</span>
      <label className={`relative flex cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] text-sm muted transition hover:border-brand-400 ${aspect === "wide" ? "aspect-[16/6]" : multiple ? "min-h-32 py-6" : "mx-auto aspect-square w-36"}`}>
        {previews.length > 0 && !multiple ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previews[0]} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <><ImagePlus className="h-7 w-7" /><span>{multiple ? "Ajouter jusqu'à 5 photos" : "Choisir une image"}</span></>
        )}
        <input type="file" name={name} accept="image/jpeg,image/png,image/webp,image/avif" multiple={multiple} className="sr-only"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []).slice(0, multiple ? 5 : 1);
            if (files.some((f) => f.size > 8 * 1024 * 1024)) { setError("Image trop lourde (8 Mo max)."); return; }
            setError("");
            setPreviews(files.map((f) => URL.createObjectURL(f)));
          }} />
      </label>
      {multiple && previews.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">{previews.map((p, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={p} alt="" className="h-16 w-16 rounded-lg object-cover" />
        ))}</div>
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
