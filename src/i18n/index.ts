import { cookies, headers } from "next/headers";
import fr, { type Messages } from "./fr";
import en from "./en";

// Ajouter une langue : créer src/i18n/<code>.ts typé `Messages` puis l'enregistrer ici.
export const LOCALES = { fr, en } as const;
export type Locale = keyof typeof LOCALES;
export const DEFAULT_LOCALE: Locale = "fr";
export const LOCALE_COOKIE = "em_locale";

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && v in LOCALES;
}

export async function getLocale(): Promise<Locale> {
  const jar = await cookies();
  const c = jar.get(LOCALE_COOKIE)?.value;
  if (isLocale(c)) return c;
  const accept = (await headers()).get("accept-language") ?? "";
  return accept.toLowerCase().startsWith("en") ? "en" : DEFAULT_LOCALE;
}

export async function getI18n() {
  const locale = await getLocale();
  const m: Messages = LOCALES[locale];
  /** Choix inline pour les contenus longs propres à une page. */
  const tx = (frText: string, enText: string) => (locale === "en" ? enText : frText);
  return { locale, m, tx };
}

export function interpolate(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}
