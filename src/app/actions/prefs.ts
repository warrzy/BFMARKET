"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isLocale, LOCALE_COOKIE } from "@/i18n";
import { LOCATION_COOKIE } from "@/server/location";
import { db } from "@/server/db";

const YEAR = 60 * 60 * 24 * 365;

export async function setLocaleAction(locale: string) {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: YEAR, sameSite: "lax" });
  revalidatePath("/", "layout");
}

export async function setLocationAction(country: string, cityId: string) {
  const jar = await cookies();
  if (!country) {
    jar.delete(LOCATION_COOKIE);
  } else {
    const c = await db.country.findFirst({ where: { code: country, active: true } });
    if (!c) return;
    const city = cityId ? await db.city.findFirst({ where: { id: cityId, countryCode: c.code } }) : null;
    jar.set(LOCATION_COOKIE, `${c.code}|${city?.id ?? ""}`, { path: "/", maxAge: YEAR, sameSite: "lax" });
  }
  revalidatePath("/", "layout");
}

/** Suggestion de ville à partir de coordonnées — appelée UNIQUEMENT après consentement explicite du navigateur. */
export async function nearestCityAction(lat: number, lng: number) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const cities = await db.city.findMany({ where: { active: true, lat: { not: null }, lng: { not: null }, country: { active: true } } });
  let best: (typeof cities)[number] | null = null;
  let bestD = Infinity;
  for (const c of cities) {
    const d = (c.lat! - lat) ** 2 + (c.lng! - lng) ** 2;
    if (d < bestD) { bestD = d; best = c; }
  }
  return best ? { country: best.countryCode, cityId: best.id } : null;
}
