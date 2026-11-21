import { describe, expect, it } from "vitest";
import { buildWhatsAppOrderMessage, waLink } from "@/lib/whatsapp";
import { formatPhoneInternational, normalizePhone } from "@/lib/phone";
import { slugify } from "@/lib/slug";
import { escapeHtml, richText } from "@/lib/utils";

describe("WhatsApp", () => {
  it("prérempli produit, variante, prix et référence", () => {
    const msg = buildWhatsAppOrderMessage({ shopName: "Awa", productTitle: "Robe wax", variant: "M", quantity: 2, unitPrice: 9000, currency: "XOF", productUrl: "https://x/p", reference: "AB12" });
    expect(msg).toContain("Robe wax (M)");
    expect(msg).toContain("18 000 FCFA");
    expect(msg).toContain("AB12");
    expect(waLink("+22670112233", "a b")).toBe("https://wa.me/22670112233?text=a%20b");
  });
});

describe("téléphones internationaux", () => {
  it("normalise par pays en E.164", () => {
    expect(normalizePhone("70 11 22 33", "BF")).toBe("+22670112233");
    expect(normalizePhone("07 07 07 07 07", "CI")).toBe("+2250707070707");
    expect(normalizePhone("abc", "BF")).toBeNull();
    expect(formatPhoneInternational("+22670112233")).toBe("+226 70 11 22 33");
  });
});

describe("sécurité du rendu", () => {
  it("échappe le HTML des vendeurs et ne garde que le gras", () => {
    expect(escapeHtml('<script>alert("x")</script>')).not.toContain("<script>");
    expect(richText("**Top** <img src=x onerror=1>\nligne")).toBe("<strong>Top</strong> &lt;img src=x onerror=1&gt;<br/>ligne");
  });
  it("génère des slugs propres", () => {
    expect(slugify("Beauté & Cosmétiques à Ouaga !")).toBe("beaute-et-cosmetiques-a-ouaga");
  });
});
