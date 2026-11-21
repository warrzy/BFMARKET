import { SiteShell } from "./SiteShell";

export function ContentPage({ title, intro, children, updated }: { title: string; intro?: string; children: React.ReactNode; updated?: string }) {
  return (
    <SiteShell>
      <article className="container-x max-w-3xl py-10">
        <h1 className="text-3xl font-extrabold sm:text-4xl">{title}</h1>
        {intro && <p className="mt-3 text-lg muted">{intro}</p>}
        {updated && <p className="mt-2 text-xs muted">Dernière mise à jour : {updated}</p>}
        <div className="mt-8 space-y-6 leading-relaxed [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_p]:muted">{children}</div>
      </article>
    </SiteShell>
  );
}
