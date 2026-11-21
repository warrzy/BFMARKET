import { db } from "@/server/db";
import { requireShop } from "@/server/auth/guards";
import { PageTitle } from "@/components/dashboard/DashShell";
import { updateStockAction } from "@/app/actions/seller";

export default async function Stocks({ searchParams }: { searchParams: Promise<{ low?: string }> }) {
  const { shop } = await requireShop();
  const low = (await searchParams).low === "1";
  const products = await db.product.findMany({
    where: { shopId: shop.id, deletedAt: null, ...(low ? { OR: [{ stock: { lte: 5 } }, { variants: { some: { stock: { lte: 5 } } } }] } : {}) },
    orderBy: [{ stock: { sort: "asc", nulls: "last" } }], take: 300, include: { variants: true },
  });
  const Row = ({ id, label, stock, variant, alert }: { id: string; label: string; stock: number | null; variant?: boolean; alert?: number | null }) => (
    <form action={updateStockAction} className="flex items-center gap-2 py-2">
      <input type="hidden" name="id" value={id} />{variant && <input type="hidden" name="variant" value="1" />}
      <span className={`flex-1 truncate text-sm ${variant ? "pl-4 muted" : "font-medium"}`}>{label}</span>
      {stock != null && stock <= (alert ?? 3) && <span className="badge bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300">{stock === 0 ? "Rupture" : "Faible"}</span>}
      <input name="stock" defaultValue={stock ?? ""} placeholder="∞" inputMode="numeric" className="input w-24 py-1.5 text-right" aria-label={`Stock ${label}`} />
      <button className="btn-ghost px-3 py-1.5 text-xs">OK</button>
    </form>
  );
  return (
    <>
      <PageTitle title="Stocks" subtitle="Le stock est décrémenté à chaque commande et restitué en cas d'annulation. Laissez vide pour ne pas suivre le stock.">
        <a href={low ? "/vendeur/stocks" : "?low=1"} className="btn-ghost">{low ? "Tous les produits" : "Stocks faibles uniquement"}</a>
      </PageTitle>
      <div className="card divide-y divide-[rgb(var(--border))] px-4">
        {products.map((p) => (
          <div key={p.id}>
            <Row id={p.id} label={p.title} stock={p.stock} alert={p.lowStockAlert} />
            {p.variants.map((v) => <Row key={v.id} id={v.id} label={v.name} stock={v.stock} variant />)}
          </div>
        ))}
        {products.length === 0 && <p className="py-6 text-center text-sm muted">Rien à afficher.</p>}
      </div>
    </>
  );
}
