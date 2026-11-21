import { SiteShell } from "@/components/layout/SiteShell";
import { ReportForm } from "@/components/account/AccountForms";

export const metadata = { title: "Signaler un contenu", robots: { index: false } };

export default async function ReportPage({ searchParams }: { searchParams: Promise<{ product?: string; shop?: string }> }) {
  const sp = await searchParams;
  return (
    <SiteShell>
      <div className="container-x max-w-lg py-10">
        <h1 className="mb-2 text-2xl font-extrabold">Signaler un contenu</h1>
        <p className="mb-6 text-sm muted">Les signalements sont examinés par l&apos;équipe de modération. Les abus répétés peuvent entraîner la suspension d&apos;une boutique.</p>
        <div className="card p-5"><ReportForm productId={sp.product} shopId={sp.shop} /></div>
      </div>
    </SiteShell>
  );
}
