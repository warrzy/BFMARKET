import { requireShop } from "@/server/auth/guards";
import { getShopEntitlements } from "@/server/modules/subscriptions/service";
import { productFormOptions } from "@/server/modules/catalog/form-data";
import { PageTitle } from "@/components/dashboard/DashShell";
import { ProductForm } from "@/components/seller/ProductForm";

export default async function NewProduct() {
  const { shop } = await requireShop();
  const [opts, ent] = await Promise.all([productFormOptions(shop.id), getShopEntitlements(shop.id)]);
  return (<><PageTitle title="Nouveau produit" /><ProductForm currency={shop.country.currency} categories={opts.categories} sections={opts.sections} canPromo={ent.features.promotions} /></>);
}
