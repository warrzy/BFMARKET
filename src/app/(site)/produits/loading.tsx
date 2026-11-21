import { ProductGridSkeleton } from "@/components/product/ProductCard";

export default function Loading() {
  return (
    <div className="container-x py-8">
      <div className="skeleton mb-6 h-16" />
      <div className="skeleton mb-4 h-8 w-48" />
      <ProductGridSkeleton />
    </div>
  );
}
