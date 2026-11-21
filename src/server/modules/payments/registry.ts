import { db } from "@/server/db";
import type { PaymentProviderInterface } from "./types";
import { cashOnDelivery, directToSeller, manualValidation } from "./providers/offline";
import { cinetpay } from "./providers/cinetpay";
import { paydunya } from "./providers/paydunya";

export const PROVIDERS: Record<string, PaymentProviderInterface> = Object.fromEntries(
  [directToSeller, cashOnDelivery, manualValidation, cinetpay, paydunya].map((p) => [p.code, p]),
);

export function getProvider(code: string): PaymentProviderInterface | undefined {
  return PROVIDERS[code];
}

/** Prestataires activés par l'admin POUR CE PAYS et réellement configurés. */
export async function availableProviders(countryCode: string) {
  const configs = await db.paymentProviderConfig.findMany({ where: { countryCode, enabled: true } });
  return configs
    .map((c) => ({ config: c, provider: PROVIDERS[c.provider] }))
    .filter((x): x is { config: typeof x.config; provider: PaymentProviderInterface } => !!x.provider && x.provider.isConfigured());
}
