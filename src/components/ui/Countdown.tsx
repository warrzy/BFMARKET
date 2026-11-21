"use client";

import { useEffect, useState } from "react";

export function Countdown({ to, compact = false }: { to: string | Date; compact?: boolean }) {
  const target = new Date(to).getTime();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (now == null) return <span className="tabular-nums">--:--:--</span>;
  const s = Math.max(0, Math.floor((target - now) / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (compact) return <span className="tabular-nums">{d > 0 ? `${d}j ` : ""}{pad(h)}:{pad(m)}:{pad(sec)}</span>;
  return (
    <span className="inline-flex gap-1 tabular-nums">
      {[d > 0 ? [d, "j"] : null, [h, "h"], [m, "m"], [sec, "s"]].filter(Boolean).map((x) => {
        const [v, u] = x as [number, string];
        return <span key={u} className="rounded-md bg-night-900 px-1.5 py-0.5 text-xs font-bold text-white dark:bg-white dark:text-night-900">{pad(v)}{u}</span>;
      })}
    </span>
  );
}
