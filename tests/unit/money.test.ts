import { describe, expect, it } from "vitest";
import { discountPercent, effectivePrice, formatPrice, isPromoActive } from "@/lib/money";

const base = { price: 10000, promoPrice: 8000, promoStartsAt: null, promoEndsAt: null };
const now = new Date("2026-11-21T12:00:00Z");

describe("prix et promotions", () => {
  it("formate en FCFA sans décimales ni conversion", () => {
    expect(formatPrice(15000, "XOF")).toBe("15 000 FCFA");
    expect(formatPrice(2500, "GHS", "en")).toBe("GH₵2,500");
    expect(formatPrice(1000, "NGN")).toBe("1 000 ₦");
  });
  it("n'affiche une promotion que si elle est réelle et active", () => {
    expect(isPromoActive(base, now)).toBe(true);
    expect(isPromoActive({ ...base, promoPrice: 12000 }, now)).toBe(false); // promo >= prix : pas de faux prix barré
    expect(isPromoActive({ ...base, promoPrice: 0 }, now)).toBe(false);
    expect(isPromoActive({ ...base, promoStartsAt: new Date("2026-11-22") }, now)).toBe(false);
    expect(isPromoActive({ ...base, promoEndsAt: new Date("2026-11-20") }, now)).toBe(false);
  });
  it("calcule le prix effectif et la remise", () => {
    expect(effectivePrice(base, now)).toBe(8000);
    expect(discountPercent(base, now)).toBe(20);
    expect(effectivePrice({ ...base, promoEndsAt: new Date("2026-01-01") }, now)).toBe(10000);
  });
});
