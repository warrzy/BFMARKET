import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { requireShop } from "@/server/auth/guards";
import { getShopEntitlements } from "@/server/modules/subscriptions/service";
import { productFormOptions, toLocalInput } from "@/server/modules/catalog/form-data";
import { PageTitle } from "@/components/dashboard/DashShell";
import { ProductForm } from "@/components/seller/ProductForm";

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { shop } = await requireShop();
  const p = await db.product.findFirst({ where: { id: (await params).id, shopId: shop.id, deletedAt: null }, include: { images: { orderBy: { position: "asc" } }, variants: true } });
  if (!p) notFound();
  const [opts, ent] = await Promise.all([productFormOptions(shop.id), getShopEntitlements(shop.id)]);
  return (
    <>
      <PageTitle title="Modifier le produit" subtitle={p.title} />
      <ProductForm
        currency={p.currency} categories={opts.categories} sections={opts.sections} canPromo={ent.features.promotions}
        initial={{ ...p, promoStartsAt: toLocalInput(p.promoStartsAt), promoEndsAt: toLocalInput(p.promoEndsAt), images: p.images.map((i) => ({ id: i.id, url: i.url })), variants: p.variants.map((v) => ({ id: v.id, name: v.name, price: v.price, stock: v.stock })) }}
      />
    </>
  );
}
