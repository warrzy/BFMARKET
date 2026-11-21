import { db } from "@/server/db";

export async function productFormOptions(shopId: string) {
  const [cats, sections] = await Promise.all([
    db.category.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }], include: { parent: true } }),
    db.shopSection.findMany({ where: { shopId }, orderBy: { position: "asc" } }),
  ]);
  const categories = cats
    .map((c) => ({ id: c.id, name: c.nameFr, parent: c.parent?.nameFr, sortKey: `${c.parent?.sortOrder ?? c.sortOrder}-${c.parent ? 1 : 0}-${c.sortOrder}` }))
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey, undefined, { numeric: true }));
  return { categories, sections: sections.map((s) => ({ id: s.id, name: s.name })) };
}

export const toLocalInput = (d: Date | null) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : undefined);
