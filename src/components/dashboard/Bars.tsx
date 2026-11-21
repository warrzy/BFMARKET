/** Petit histogramme sans dépendance (SSR, léger). */
export function Bars({ data, label, format = (n: number) => String(n) }: { data: { key: string; label: string; value: number }[]; label: string; format?: (n: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <figure>
      <figcaption className="sr-only">{label}</figcaption>
      <div className="flex h-40 items-end gap-1" role="img" aria-label={label}>
        {data.map((d) => (
          <div key={d.key} className="group relative flex h-full flex-1 flex-col justify-end">
            <div className="rounded-t-md bg-brand-500/80 transition group-hover:bg-brand-500" style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value ? 3 : 0 }} />
            <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-night-900 px-1.5 py-0.5 text-[10px] text-white group-hover:block">{format(d.value)}</span>
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1 text-[10px] muted">{data.map((d, i) => <span key={d.key} className="flex-1 text-center">{i % Math.ceil(data.length / 7) === 0 ? d.label : ""}</span>)}</div>
    </figure>
  );
}
