"use client";

import { Moon, Sun } from "lucide-react";

export function ThemeToggle({ label = "Thème" }: { label?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="grid h-10 w-10 place-items-center rounded-xl hover:bg-[rgb(var(--surface-2))]"
      onClick={() => {
        const dark = document.documentElement.classList.toggle("dark");
        try { localStorage.setItem("em_theme", dark ? "dark" : "light"); } catch {}
      }}
    >
      <Sun className="hidden h-5 w-5 dark:block" />
      <Moon className="h-5 w-5 dark:hidden" />
    </button>
  );
}
