import { describe, expect, it } from "vitest";
import { parseCatalogFile, toCsv } from "@/server/modules/catalog/import";

describe("import de catalogue", () => {
  it("valide chaque ligne et rapporte les erreurs", async () => {
    const csv = "titre;prix;prix_promo;stock;type\nRobe wax;15000;12000;3;physique\n;5000;;;\nSac;8000;9000;;\nE-book;2000;;;numerique\n";
    const r = await parseCatalogFile(new File([csv], "c.csv", { type: "text/csv" }));
    expect(r.rows.map((x) => x.titre)).toEqual(["Robe wax", "E-book"]);
    expect(r.rows[1].type).toBe("DIGITAL");
    expect(r.errors.map((e) => e.line)).toEqual([3, 4]);
  });
  it("refuse les formats non pris en charge", async () => {
    const r = await parseCatalogFile(new File(["x"], "c.pdf"));
    expect(r.errors[0].message).toMatch(/csv/);
  });
  it("neutralise l'injection de formules à l'export", () => {
    expect(toCsv([{ titre: "=HYPERLINK(1)", description: "", prix: 1, prix_promo: null, stock: null, categorie: "", type: "PHYSICAL", mots_cles: "", sku: "", image_url: "" }])).toContain("'=HYPERLINK");
  });
});
