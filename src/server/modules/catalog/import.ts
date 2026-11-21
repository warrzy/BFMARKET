import Papa from "papaparse";
import ExcelJS from "exceljs";
import { z } from "zod";

// Import/export de catalogue CSV et Excel, avec rapport d'erreurs ligne par ligne.
export const IMPORT_COLUMNS = ["titre", "description", "prix", "prix_promo", "stock", "categorie", "type", "mots_cles", "sku", "image_url"] as const;

const rowSchema = z.object({
  titre: z.string().trim().min(2, "titre requis").max(140),
  description: z.string().trim().max(5000).optional().default(""),
  prix: z.coerce.number().int("prix entier").positive("prix > 0"),
  prix_promo: z.union([z.literal(""), z.coerce.number().int().positive()]).optional().transform((v) => (v === "" || v == null ? null : v)),
  stock: z.union([z.literal(""), z.coerce.number().int().min(0)]).optional().transform((v) => (v === "" || v == null ? null : v)),
  categorie: z.string().trim().optional().default(""),
  type: z.enum(["PHYSICAL", "DIGITAL", "SERVICE", "physique", "numerique", "service", ""]).optional().default("PHYSICAL")
    .transform((t) => (t === "numerique" ? "DIGITAL" : t === "service" ? "SERVICE" : t === "physique" || !t ? "PHYSICAL" : t) as "PHYSICAL" | "DIGITAL" | "SERVICE"),
  mots_cles: z.string().optional().default(""),
  sku: z.string().trim().max(64).optional().default(""),
  image_url: z.string().trim().url("image_url invalide").startsWith("https://", "image_url doit être en https").optional().or(z.literal("")).default(""),
});

export type ImportRow = z.infer<typeof rowSchema>;
export interface ImportReport { rows: ImportRow[]; errors: { line: number; message: string }[] }

function normalizeKeys(r: Record<string, unknown>) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(r)) {
    const key = k.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase().replace(/\s+/g, "_");
    out[key] = v == null ? "" : String(typeof v === "object" && v && "text" in v ? (v as { text: string }).text : v).trim();
  }
  return out;
}

function validate(raw: Record<string, unknown>[], maxRows: number): ImportReport {
  const report: ImportReport = { rows: [], errors: [] };
  if (raw.length > maxRows) report.errors.push({ line: 0, message: `Fichier limité à ${maxRows} lignes.` });
  raw.slice(0, maxRows).forEach((r, idx) => {
    const res = rowSchema.safeParse(normalizeKeys(r));
    if (res.success) {
      if (res.data.prix_promo != null && res.data.prix_promo >= res.data.prix) {
        report.errors.push({ line: idx + 2, message: "prix_promo doit être inférieur au prix" });
      } else report.rows.push(res.data);
    } else {
      report.errors.push({ line: idx + 2, message: res.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ") });
    }
  });
  return report;
}

export async function parseCatalogFile(file: File, maxRows = 2000): Promise<ImportReport> {
  if (file.size > 5 * 1024 * 1024) return { rows: [], errors: [{ line: 0, message: "Fichier trop lourd (5 Mo max)." }] };
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) {
    const text = await file.text();
    const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true, delimitersToGuess: [",", ";", "\t"] });
    return validate(parsed.data, maxRows);
  }
  if (name.endsWith(".xlsx")) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(Buffer.from(await file.arrayBuffer()) as unknown as ArrayBuffer);
    const ws = wb.worksheets[0];
    if (!ws) return { rows: [], errors: [{ line: 0, message: "Classeur vide." }] };
    const headers: string[] = [];
    ws.getRow(1).eachCell((c, i) => (headers[i] = String(c.value ?? "")));
    const raw: Record<string, unknown>[] = [];
    ws.eachRow((row, n) => {
      if (n === 1) return;
      const o: Record<string, unknown> = {};
      row.eachCell({ includeEmpty: true }, (c, i) => { if (headers[i]) o[headers[i]] = c.value; });
      raw.push(o);
    });
    return validate(raw, maxRows);
  }
  return { rows: [], errors: [{ line: 0, message: "Format accepté : .csv ou .xlsx" }] };
}

export function toCsv(rows: Record<string, string | number | null>[]): string {
  // Protection contre l'injection de formules dans les tableurs
  const safe = rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === "string" && /^[=+\-@]/.test(v) ? `'${v}` : v ?? ""])));
  return Papa.unparse(safe, { columns: [...IMPORT_COLUMNS] });
}

export async function toXlsx(rows: Record<string, string | number | null>[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Catalogue");
  ws.columns = IMPORT_COLUMNS.map((c) => ({ header: c, key: c, width: c === "description" ? 50 : 18 }));
  rows.forEach((r) => ws.addRow(r));
  return Buffer.from(await wb.xlsx.writeBuffer());
}
