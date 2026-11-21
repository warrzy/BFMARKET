import { describe, expect, it } from "vitest";
import { addInterval, effectiveFeatures, FALLBACK_FEATURES, GRACE_DAYS, nextLifecycleState, parseFeatures } from "@/server/modules/subscriptions/entitlements";

const day = 86400_000;
describe("abonnements", () => {
  const end = new Date("2026-11-21T00:00:00Z");
  it("passe en période de grâce puis en limitation progressive", () => {
    expect(nextLifecycleState({ status: "ACTIVE", currentPeriodEnd: end }, new Date(end.getTime() - day))).toBe("ACTIVE");
    expect(nextLifecycleState({ status: "ACTIVE", currentPeriodEnd: end }, new Date(end.getTime() + day))).toBe("PAST_DUE");
    expect(nextLifecycleState({ status: "PAST_DUE", currentPeriodEnd: end }, new Date(end.getTime() + (GRACE_DAYS + 1) * day))).toBe("RESTRICTED");
    expect(nextLifecycleState({ status: "TRIALING", currentPeriodEnd: end }, new Date(end.getTime() + day))).toBe("PAST_DUE");
  });
  it("retombe sur l'offre gratuite en cas de restriction", () => {
    const pro = parseFeatures({ maxProducts: 300, promotions: true });
    const free = parseFeatures({ maxProducts: 15 });
    expect(effectiveFeatures(pro, "PAST_DUE", free).maxProducts).toBe(300);
    expect(effectiveFeatures(pro, "RESTRICTED", free).maxProducts).toBe(15);
    expect(effectiveFeatures(pro, "RESTRICTED", free).promotions).toBe(false);
  });
  it("complète les droits manquants avec un repli sûr", () => {
    expect(parseFeatures(null)).toEqual(FALLBACK_FEATURES);
    expect(parseFeatures({ maxProducts: null }).maxProducts).toBeNull();
  });
  it("calcule les périodes mensuelles et annuelles", () => {
    expect(addInterval(new Date("2026-01-15"), "monthly").toISOString().slice(0, 10)).toBe("2026-02-15");
    expect(addInterval(new Date("2026-01-15"), "yearly").toISOString().slice(0, 10)).toBe("2027-01-15");
  });
});
