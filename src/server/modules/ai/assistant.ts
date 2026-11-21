// Assistant IA : amélioration de descriptions et messages publicitaires.
// Utilise l'API Claude si ANTHROPIC_API_KEY est défini, sinon un gabarit local déterministe.

export interface DescribeInput {
  title: string;
  description: string;
  category?: string;
  city?: string;
  locale?: "fr" | "en";
  kind?: "description" | "ad";
}

function fallback(i: DescribeInput): string {
  const en = i.locale === "en";
  const base = i.description.trim();
  if (i.kind === "ad") {
    return en
      ? `🔥 ${i.title} now available${i.city ? ` in ${i.city}` : ""}!\n${base ? base.split("\n")[0] + "\n" : ""}📲 Order in one click on ECOM MARKET or WhatsApp.`
      : `🔥 ${i.title} disponible${i.city ? ` à ${i.city}` : ""} !\n${base ? base.split("\n")[0] + "\n" : ""}📲 Commandez en un clic sur ECOM MARKET ou WhatsApp.`;
  }
  const lines = base.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  return [
    `**${i.title}**`,
    ...(lines.length ? lines.map((l) => `• ${l.replace(/^[-•*]\s*/, "")}`) : [en ? "• Quality product, carefully selected." : "• Produit de qualité, soigneusement sélectionné."]),
    en ? "• Delivery or pick-up to be agreed with the seller." : "• Livraison ou retrait à convenir avec le vendeur.",
    en ? "Order now — reply guaranteed quickly." : "Commandez dès maintenant, réponse rapide garantie.",
  ].join("\n");
}

export async function improveText(i: DescribeInput): Promise<{ text: string; source: "ai" | "template" }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { text: fallback(i), source: "template" };
  const en = i.locale === "en";
  const task = i.kind === "ad"
    ? (en ? "Write a short, punchy social media ad (max 4 lines, 2-3 emojis) for this product." : "Rédige une publicité courte et percutante pour les réseaux sociaux (4 lignes max, 2-3 emojis) pour ce produit.")
    : (en ? "Rewrite this product description to be clear, attractive and honest (max 120 words, short bullet points, no invented features or claims)." : "Réécris cette description produit pour qu'elle soit claire, attractive et honnête (120 mots max, puces courtes, n'invente aucune caractéristique ni promesse).");
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.AI_MODEL || "claude-haiku-5-5",
        max_tokens: 400,
        system: en ? "You help West African merchants write product copy. Plain text only; use **bold** sparingly." : "Tu aides des commerçants d'Afrique de l'Ouest à rédiger leurs fiches produits. Texte brut uniquement ; **gras** avec parcimonie.",
        messages: [{ role: "user", content: `${task}\n\nTitre : ${i.title}\nCatégorie : ${i.category ?? "-"}\nVille : ${i.city ?? "-"}\nTexte actuel :\n${i.description.slice(0, 2000)}` }],
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(String(res.status));
    const json = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = json.content?.find((c) => c.type === "text")?.text?.trim();
    if (!text) throw new Error("empty");
    return { text, source: "ai" };
  } catch {
    return { text: fallback(i), source: "template" };
  }
}
