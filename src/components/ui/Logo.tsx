import Link from "next/link";

export function Logo({ className = "", light = false }: { className?: string; light?: boolean }) {
  return (
    <Link href="/" className={`group inline-flex items-center gap-2 ${className}`} aria-label="ECOM MARKET — accueil">
      <svg viewBox="0 0 64 64" className="h-9 w-9 shrink-0 transition-transform group-hover:-rotate-6" aria-hidden>
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FF7438" /><stop offset="1" stopColor="#BC2A09" /></linearGradient>
        </defs>
        <rect width="64" height="64" rx="16" fill="url(#lg)" />
        <path d="M18 22h28l-3 22a4 4 0 0 1-4 3.5H25A4 4 0 0 1 21 44z" fill="#fff" />
        <path d="M25 22v-2a7 7 0 0 1 14 0v2" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M27 33h10M27 39h7" stroke="#BC2A09" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
      <span className={`font-display text-[19px] font-extrabold leading-none tracking-tight ${light ? "text-white" : ""}`}>
        ECOM<span className="text-brand-500">MARKET</span>
      </span>
    </Link>
  );
}
