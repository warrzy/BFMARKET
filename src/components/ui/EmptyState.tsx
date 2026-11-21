import { PackageOpen } from "lucide-react";

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10"><PackageOpen className="h-7 w-7" /></div>
      <p className="font-semibold">{title}</p>
      {children && <div className="muted text-sm">{children}</div>}
    </div>
  );
}
