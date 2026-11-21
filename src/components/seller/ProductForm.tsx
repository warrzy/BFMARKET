"use client";

import { useActionState, useState, useTransition } from "react";
import { Plus, Sparkles, Trash2, X } from "lucide-react";
import { aiImproveAction, saveProductAction } from "@/app/actions/seller";
import { FormMessage, SubmitButton } from "@/components/ui/SubmitButton";
import { ImagePicker } from "./ImagePicker";

interface Variant { id?: string; name: string; price: number | null; stock: number | null }
interface Initial {
  id?: string; title?: string; description?: string; type?: string; price?: number; promoPrice?: number | null; promoStartsAt?: string; promoEndsAt?: string;
  stock?: number | null; lowStockAlert?: number | null; categoryId?: string | null; shopSectionId?: string | null; sku?: string | null; tags?: string[];
  status?: string; featured?: boolean; seoTitle?: string | null; seoDescription?: string | null; digitalFileUrl?: string | null; videoUrl?: string | null;
  images?: { id: string; url: string }[]; variants?: Variant[];
}

export function ProductForm({ initial = {}, currency, categories, sections, canPromo }: {
  initial?: Initial; currency: string; categories: { id: string; name: string; parent?: string }[]; sections: { id: string; name: string }[]; canPromo: boolean;
}) {
  const [state, action] = useActionState(saveProductAction, undefined);
  const [variants, setVariants] = useState<Variant[]>(initial.variants ?? []);
  const [removed, setRemoved] = useState<string[]>([]);
  const [title, setTitle] = useState(initial.title ?? "");
  const [desc, setDesc] = useState(initial.description ?? "");
  const [type, setType] = useState(initial.type ?? "PHYSICAL");
  const [aiMsg, setAiMsg] = useState("");
  const [ad, setAd] = useState("");
  const [aiPending, startAi] = useTransition();
  const [catId, setCatId] = useState(initial.categoryId ?? "");

  const ai = (kind: "description" | "ad") => startAi(async () => {
    setAiMsg("");
    if (title.trim().length < 2) return setAiMsg("Indiquez d'abord le titre du produit.");
    const r = await aiImproveAction({ title, description: desc, kind, categoryName: categories.find((c) => c.id === catId)?.name });
    if (r.error) return setAiMsg(r.error);
    if (kind === "description") setDesc(r.text); else setAd(r.text);
    setAiMsg(r.source === "ai" ? "Texte proposé par l'assistant IA — relisez avant de publier." : "Suggestion générée à partir d'un modèle — relisez et complétez.");
  });

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_340px]">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="variants" value={JSON.stringify(variants)} />
      <input type="hidden" name="removeImages" value={removed.join(",")} />
      <div className="space-y-6">
        <section className="card space-y-4 p-5">
          <div><label className="label" htmlFor="title">Titre *</label><input id="title" name="title" required value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} className="input" /></div>
          <div>
            <div className="mb-1.5 flex items-center justify-between"><label className="label mb-0" htmlFor="description">Description</label>
              <button type="button" onClick={() => ai("description")} disabled={aiPending} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600"><Sparkles className="h-3.5 w-3.5" />{aiPending ? "…" : "Améliorer avec l'IA"}</button></div>
            <textarea id="description" name="description" rows={7} value={desc} onChange={(e) => setDesc(e.target.value)} className="input" placeholder="Matière, dimensions, état, garantie… Utilisez **texte** pour mettre en gras." />
            {aiMsg && <p className="mt-1 text-xs muted">{aiMsg}</p>}
          </div>
          <div className="rounded-xl bg-[rgb(var(--surface-2))] p-3">
            <button type="button" onClick={() => ai("ad")} disabled={aiPending} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600"><Sparkles className="h-3.5 w-3.5" />Générer un message publicitaire (WhatsApp / Facebook / TikTok)</button>
            {ad && <textarea readOnly value={ad} rows={4} className="input mt-2 text-sm" onFocus={(e) => e.currentTarget.select()} />}
          </div>
        </section>

        <section className="card space-y-4 p-5">
          <h2 className="font-bold">Photos et vidéo</h2>
          {initial.images && initial.images.length > 0 && (
            <div className="flex flex-wrap gap-2">{initial.images.filter((i) => !removed.includes(i.id)).map((i) => (
              <div key={i.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={i.url} alt="" className="h-20 w-20 rounded-xl object-cover" />
                <button type="button" onClick={() => setRemoved([...removed, i.id])} className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-red-600 text-white" aria-label="Retirer la photo"><X className="h-3.5 w-3.5" /></button>
              </div>
            ))}</div>
          )}
          <ImagePicker name="images" label="Ajouter des photos (8 max, compressées automatiquement)" multiple />
          <div><label className="label" htmlFor="video">Courte vidéo verticale (MP4/WebM, 30 Mo max)</label><input id="video" name="video" type="file" accept="video/mp4,video/webm" className="input" />
            {initial.videoUrl && <p className="mt-1 text-xs muted">Une vidéo est déjà associée ; en choisir une autre la remplace.</p>}</div>
        </section>

        <section className="card space-y-4 p-5">
          <div className="flex items-center justify-between"><h2 className="font-bold">Variantes (taille, couleur, capacité…)</h2>
            <button type="button" className="btn-ghost text-xs" onClick={() => setVariants([...variants, { name: "", price: null, stock: null }])}><Plus className="h-3.5 w-3.5" />Ajouter</button></div>
          {variants.length === 0 && <p className="text-sm muted">Aucune variante : le produit est vendu tel quel.</p>}
          {variants.map((v, i) => (
            <div key={i} className="grid grid-cols-[1fr_110px_90px_auto] items-center gap-2">
              <input aria-label="Nom de la variante" placeholder="Ex. Rouge / XL" className="input" value={v.name} onChange={(e) => setVariants(variants.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))} />
              <input aria-label="Prix spécifique" placeholder={`Prix (${currency})`} inputMode="numeric" className="input" value={v.price ?? ""} onChange={(e) => setVariants(variants.map((x, k) => (k === i ? { ...x, price: e.target.value ? Number(e.target.value) : null } : x)))} />
              <input aria-label="Stock" placeholder="Stock" inputMode="numeric" className="input" value={v.stock ?? ""} onChange={(e) => setVariants(variants.map((x, k) => (k === i ? { ...x, stock: e.target.value ? Number(e.target.value) : null } : x)))} />
              <button type="button" onClick={() => setVariants(variants.filter((_, k) => k !== i))} className="p-2 text-red-600" aria-label="Supprimer"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </section>

        <details className="card p-5">
          <summary className="cursor-pointer font-bold">Référencement (SEO)</summary>
          <div className="mt-4 space-y-3">
            <div><label className="label" htmlFor="seoTitle">Titre SEO (70 car.)</label><input id="seoTitle" name="seoTitle" maxLength={70} defaultValue={initial.seoTitle ?? ""} className="input" /></div>
            <div><label className="label" htmlFor="seoDescription">Description SEO (160 car.)</label><textarea id="seoDescription" name="seoDescription" maxLength={160} rows={2} defaultValue={initial.seoDescription ?? ""} className="input" /></div>
          </div>
        </details>
      </div>

      <div className="space-y-6">
        <section className="card space-y-4 p-5">
          <div><label className="label" htmlFor="status">Statut</label>
            <select id="status" name="status" defaultValue={initial.status === "PENDING_REVIEW" ? "ACTIVE" : initial.status ?? "ACTIVE"} className="input">
              <option value="ACTIVE">Publié</option><option value="DRAFT">Brouillon</option><option value="UNAVAILABLE">Indisponible</option></select></div>
          <div><label className="label" htmlFor="type">Type</label>
            <select id="type" name="type" value={type} onChange={(e) => setType(e.target.value)} className="input"><option value="PHYSICAL">Produit physique</option><option value="DIGITAL">Produit numérique</option><option value="SERVICE">Prestation de service</option></select></div>
          {type === "DIGITAL" && <div><label className="label" htmlFor="digitalFileUrl">Lien du fichier (https, remis après paiement confirmé)</label><input id="digitalFileUrl" name="digitalFileUrl" type="url" defaultValue={initial.digitalFileUrl ?? ""} className="input" /></div>}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="featured" defaultChecked={initial.featured} />Produit vedette de la boutique</label>
        </section>
        <section className="card space-y-4 p-5">
          <div><label className="label" htmlFor="price">Prix ({currency}) *</label><input id="price" name="price" required inputMode="numeric" defaultValue={initial.price} className="input text-lg font-bold" /></div>
          <fieldset disabled={!canPromo} className="space-y-3 disabled:opacity-60">
            <div><label className="label" htmlFor="promoPrice">Prix promotionnel</label><input id="promoPrice" name="promoPrice" inputMode="numeric" defaultValue={initial.promoPrice ?? ""} className="input" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="label text-xs" htmlFor="promoStartsAt">Début</label><input id="promoStartsAt" name="promoStartsAt" type="datetime-local" defaultValue={initial.promoStartsAt} className="input text-sm" /></div>
              <div><label className="label text-xs" htmlFor="promoEndsAt">Fin</label><input id="promoEndsAt" name="promoEndsAt" type="datetime-local" defaultValue={initial.promoEndsAt} className="input text-sm" /></div>
            </div>
            {!canPromo && <p className="text-xs muted">Promotions planifiées : offre Pro ou Business.</p>}
            <p className="text-xs muted">Le prix barré n&apos;est affiché que pendant la période réelle de promotion.</p>
          </fieldset>
        </section>
        <section className="card space-y-4 p-5">
          <div className="grid grid-cols-2 gap-2">
            <div><label className="label" htmlFor="stock">Stock</label><input id="stock" name="stock" inputMode="numeric" defaultValue={initial.stock ?? ""} placeholder="Illimité" className="input" /></div>
            <div><label className="label" htmlFor="lowStockAlert">Alerte stock</label><input id="lowStockAlert" name="lowStockAlert" inputMode="numeric" defaultValue={initial.lowStockAlert ?? ""} className="input" /></div>
          </div>
          <div><label className="label" htmlFor="sku">Référence (SKU)</label><input id="sku" name="sku" defaultValue={initial.sku ?? ""} className="input" /></div>
          <div><label className="label" htmlFor="categoryId">Catégorie</label>
            <select id="categoryId" name="categoryId" value={catId} onChange={(e) => setCatId(e.target.value)} className="input"><option value="">—</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.parent ? `${c.parent} › ` : ""}{c.name}</option>)}</select></div>
          {sections.length > 0 && <div><label className="label" htmlFor="shopSectionId">Rayon de la boutique</label><select id="shopSectionId" name="shopSectionId" defaultValue={initial.shopSectionId ?? ""} className="input"><option value="">—</option>{sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>}
          <div><label className="label" htmlFor="tags">Mots-clés (séparés par des virgules)</label><input id="tags" name="tags" defaultValue={initial.tags?.join(", ")} className="input" /></div>
        </section>
        <FormMessage state={state} />
        <SubmitButton pendingText="Enregistrement…">{initial.id ? "Enregistrer les modifications" : "Publier le produit"}</SubmitButton>
      </div>
    </form>
  );
}
