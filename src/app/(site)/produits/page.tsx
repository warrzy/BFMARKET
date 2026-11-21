import type { Metadata } from "next";
import { getI18n } from "@/i18n";
import { SiteShell } from "@/components/layout/SiteShell";
import { CatalogView } from "@/components/product/CatalogView";

export const metadata: Metadata = { title: "Produits" };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { tx } = await getI18n();
  return (
    <SiteShell q={typeof sp.q === "string" ? sp.q : ""}>
      <CatalogView sp={sp} title={sp.q ? tx("Recherche", "Search") : tx("Tous les produits", "All products")} />
    </SiteShell>
  );
}
