import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function Section({ title, href, seeAll, children, icon, className = "", subtitle }: {
  title: string; href?: string; seeAll?: string; children: React.ReactNode; icon?: React.ReactNode; className?: string; subtitle?: React.ReactNode;
}) {
  return (
    <section className={`container-x mt-10 sm:mt-14 ${className}`}>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-extrabold sm:text-2xl">{icon}{title}</h2>
          {subtitle && <div className="mt-1 text-sm muted">{subtitle}</div>}
        </div>
        {href && seeAll && (
          <Link href={href} className="group inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-600 dark:text-brand-400">
            {seeAll}<ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
