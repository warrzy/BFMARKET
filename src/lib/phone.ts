import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

/** Normalise un numéro en E.164 (ex. +22670123456). Retourne null si invalide. */
export function normalizePhone(input: string, country?: string): string | null {
  const cleaned = input.replace(/[^\d+]/g, "");
  if (!cleaned) return null;
  const parsed = parsePhoneNumberFromString(cleaned, country as CountryCode | undefined);
  if (!parsed || !parsed.isPossible()) return null;
  return parsed.number;
}

export function formatPhoneInternational(e164: string): string {
  const parsed = parsePhoneNumberFromString(e164);
  return parsed ? parsed.formatInternational() : e164;
}

/** Pour les liens wa.me : chiffres uniquement, sans +. */
export function waDigits(e164: string): string {
  return e164.replace(/\D/g, "");
}
