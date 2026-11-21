import { describe, expect, it } from "vitest";
import { CartError, couponDiscount, groupByShop, priceLines, type PricedProduct } from "@/server/modules/orders/pricing";
import { canChangePayment, canTransition } from "@/server/modules/orders/state";

const product = (o: Partial<PricedProduct> = {}): PricedProduct => ({
  id: "p1", shopId: "s1", title: "Robe", currency: "XOF", stock: 5, status: "ACTIVE", variants: [],
  price: 10000, promoPrice: null, promoStartsAt: null, promoEndsAt: null, ...o,
});

describe("tarification du panier (côté serveur)", () => {
  it("ignore tout prix envoyé par le client et recalcule", () => {
    const lines = priceLines([{ productId: "p1", quantity: 2 }], new Map([["p1", product({ promoPrice: 9000 })]]));
    expect(lines[0]).toMatchObject({ unitPrice: 9000, total: 18000 });
  });
  it("refuse un stock insuffisant, une quantité invalide, un produit inactif", () => {
    const m = new Map([["p1", product()]]);
    expect(() => priceLines([{ productId: "p1", quantity: 6 }], m)).toThrow(CartError);
    expect(() => priceLines([{ productId: "p1", quantity: 0 }], m)).toThrow(CartError);
    expect(() => priceLines([{ productId: "p1", quantity: 1 }], new Map([["p1", product({ status: "DRAFT" })]]))).toThrow(CartError);
    expect(() => priceLines([{ productId: "nope", quantity: 1 }], m)).toThrow(CartError);
  });
  it("exige une variante quand le produit en a, et applique son prix et son stock", () => {
    const p = product({ variants: [{ id: "v1", name: "XL", price: 12000, stock: 1 }] });
    const m = new Map([["p1", p]]);
    expect(() => priceLines([{ productId: "p1", quantity: 1 }], m)).toThrow(/variante/);
    expect(priceLines([{ productId: "p1", variantId: "v1", quantity: 1 }], m)[0]).toMatchObject({ unitPrice: 12000, variantName: "XL" });
    expect(() => priceLines([{ productId: "p1", variantId: "v1", quantity: 2 }], m)).toThrow(/Stock/);
  });
  it("crée un groupe (sous-commande) par boutique", () => {
    const m = new Map([["p1", product()], ["p2", product({ id: "p2", shopId: "s2" })]]);
    const groups = groupByShop(priceLines([{ productId: "p1", quantity: 1 }, { productId: "p2", quantity: 1 }], m));
    expect([...groups.keys()]).toEqual(["s1", "s2"]);
  });
  it("plafonne les réductions de coupon", () => {
    expect(couponDiscount({ percentOff: 10, amountOff: null, currency: null }, 15000, "XOF")).toBe(1500);
    expect(couponDiscount({ percentOff: null, amountOff: 20000, currency: "XOF" }, 15000, "XOF")).toBe(15000);
    expect(couponDiscount({ percentOff: null, amountOff: 500, currency: "GHS" }, 15000, "XOF")).toBe(0); // pas de conversion
  });
});

describe("machine à états", () => {
  it("encadre les transitions de statut", () => {
    expect(canTransition("PENDING", "CONFIRMED")).toBe(true);
    expect(canTransition("PENDING", "DELIVERED")).toBe(false);
    expect(canTransition("CANCELLED", "CONFIRMED")).toBe(false);
    expect(canTransition("DELIVERED", "RETURNED")).toBe(true);
  });
  it("le client ne peut jamais marquer une commande payée, seulement déclarer", () => {
    expect(canChangePayment("buyer", "UNPAID", "PAID")).toBe(false);
    expect(canChangePayment("buyer", "UNPAID", "DECLARED")).toBe(true);
    expect(canChangePayment("seller", "DECLARED", "PAID")).toBe(true);
    expect(canChangePayment("seller", "PENDING", "PAID")).toBe(false); // paiement en ligne : seul le prestataire vérifié tranche
    expect(canChangePayment("provider", "PENDING", "PAID")).toBe(true);
  });
});
