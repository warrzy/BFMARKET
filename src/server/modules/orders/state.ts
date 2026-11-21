import type { PaymentStatus, SubOrderStatus } from "@prisma/client";

// Machine à états des sous-commandes (une par boutique).
export const SUBORDER_TRANSITIONS: Record<SubOrderStatus, SubOrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "SHIPPED", "DELIVERED", "CANCELLED"],
  PREPARING: ["SHIPPED", "DELIVERED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "RETURNED"],
  DELIVERED: ["RETURNED"],
  CANCELLED: [],
  RETURNED: [],
};

export function canTransition(from: SubOrderStatus, to: SubOrderStatus): boolean {
  return SUBORDER_TRANSITIONS[from].includes(to);
}

/**
 * Transitions de paiement autorisées par acteur.
 * Règle clé : rien ne passe à PAID automatiquement sans vérification serveur
 * d'un prestataire (actor "provider") ou validation humaine explicite ("seller"/"admin").
 * Le client ne peut que DÉCLARER un paiement.
 */
type PaymentActor = "buyer" | "seller" | "admin" | "provider";
const PAYMENT_RULES: Record<PaymentActor, Partial<Record<PaymentStatus, PaymentStatus[]>>> = {
  buyer: { UNPAID: ["DECLARED"], FAILED: ["DECLARED"] },
  seller: {
    UNPAID: ["PAID"], DECLARED: ["PAID", "UNPAID"], FAILED: ["PAID"], PAID: ["REFUNDED"],
  },
  admin: {
    UNPAID: ["PAID"], DECLARED: ["PAID", "UNPAID"], PENDING: ["PAID", "FAILED"], FAILED: ["PAID"],
    PAID: ["REFUNDED", "UNPAID"],
  },
  provider: { UNPAID: ["PENDING", "PAID", "FAILED"], PENDING: ["PAID", "FAILED"], FAILED: ["PENDING", "PAID"], PAID: ["REFUNDED"] },
};

export function canChangePayment(actor: PaymentActor, from: PaymentStatus, to: PaymentStatus): boolean {
  return PAYMENT_RULES[actor][from]?.includes(to) ?? false;
}
