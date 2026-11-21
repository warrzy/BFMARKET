import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/server/db";

export const LOCATION_COOKIE = "em_loc";

/** Localisation choisie par l'utilisateur (cookie « BF|cityId »). Aucune géolocalisation sans consentement. */
export const getLocation = cache(async () => {
  const raw = (await cookies()).get(LOCATION_COOKIE)?.value ?? "";
  const [country, cityId] = raw.split("|");
  const c = country ? await db.country.findFirst({ where: { code: country, active: true } }) : null;
  const city = c && cityId ? await db.city.findFirst({ where: { id: cityId, countryCode: c.code } }) : null;
  return { country: c?.code, countryData: c, cityId: city?.id, cityData: city };
});

export const getActiveCountries = cache(() =>
  db.country.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { nameFr: "asc" }], include: { cities: { where: { active: true }, orderBy: { name: "asc" } } } }),
);
