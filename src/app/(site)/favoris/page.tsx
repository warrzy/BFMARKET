import Link from "next/link";
import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import { getI18n } from "@/i18n";
import { SiteShell } from "@/components/layout/SiteShell";
import { ProductGrid } from "@/components/product/ProductCard";
import { productCardSelect } from "@/server/modules/catalog/queries";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = { title: "Favoris", robots: { index: false } };

export default async function FavoritesPage() {
  const user = await getCurrentUser();
  const { locale, tx } = await getI18n();
  const favs = user ? await db.favorite.findMany({ where: { userId: user.id, product: { deletedAt: null, status: "ACTIVE" } }, orderBy: { createdAt: "desc" }, include: { product: { select: productCardSelect } } }) : [];
  return (
    <SiteShell>
      <div className="container-x py-8">
        <h1 className="mb-6 text-3xl font-extrabold">{tx("Mes favoris", "My favorites")}</h1>
        {!user ? <EmptyState title={tx("Connectez-vous pour retrouver vos favoris sur tous vos appareils.", "Log in to keep your favorites on all devices.")}><Link href="/connexion?next=/favoris" className="font-semibold text-brand-600">{tx("Se connecter", "Log in")}</Link></EmptyState>
          : favs.length === 0 ? <EmptyState title={tx("Aucun favori pour l'instant.", "No favorites yet.")} />
          : <ProductGrid items={favs.map((f) => f.product)} locale={locale} />}
      </div>
    </SiteShell>
  );
}
