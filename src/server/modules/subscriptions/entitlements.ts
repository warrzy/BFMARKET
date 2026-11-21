// Droits d'une boutique selon son offre. Les VALEURS (limites, prix) viennent de la base,
// configurables dans l'administration ; ce fichier ne définit que la forme et un repli sûr.

export interface PlanFeatures {
  maxProducts: number | null; // null = illimité (usage raisonnable)
  promotions: boolean;
  advancedStats: boolean;
  customization: boolean;
  staffAccounts: number;
  import: boolean;
  ai: boolean;
  featured: boolean;
  prioritySupport: boolean;
  advancedStock: boolean;
}

export const FALLBACK_FEATURES: PlanFeatures = {
  maxProducts: 10, promotions: false, advancedStats: false, customization: false, staffAccounts: 0,
  import: false, ai: false, featured: false, prioritySupport: false, advancedStock: false,
};

export function parseFeatures(json: unknown): PlanFeatures {
  const f = (json && typeof json === "object" ? json : {}) as Partial<PlanFeatures>;
  return { ...FALLBACK_FEATURES, ...f };
}

export type SubState = "TRIALING" | "ACTIVE" | "PAST_DUE" | "RESTRICTED" | "CANCELLED";

/**
 * Limitation progressive : pendant la période de grâce (PAST_DUE) la boutique garde ses droits ;
 * en RESTRICTED ou CANCELLED elle retombe sur l'offre gratuite.
 */
export function effectiveFeatures(planFeatures: PlanFeatures, status: SubState | null, freeFeatures: PlanFeatures): PlanFeatures {
  if (!status || status === "RESTRICTED" || status === "CANCELLED") return freeFeatures;
  return planFeatures;
}

export const GRACE_DAYS = 7;

export function nextLifecycleState(
  s: { status: SubState; currentPeriodEnd: Date | null },
  now = new Date(),
): SubState {
  if (!s.currentPeriodEnd || s.status === "CANCELLED") return s.status;
  const end = s.currentPeriodEnd.getTime();
  if (now.getTime() <= end) return s.status;
  if (now.getTime() <= end + GRACE_DAYS * 86400_000) return "PAST_DUE";
  return "RESTRICTED";
}

export function addInterval(from: Date, interval: "monthly" | "yearly"): Date {
  const d = new Date(from);
  if (interval === "yearly") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d;
}
