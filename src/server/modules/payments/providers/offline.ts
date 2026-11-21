import type { PaymentProviderInterface } from "../types";

// Modes hors ligne : disponibles dès le lancement, sans API Mobile Money.
// Aucun ne marque la commande comme payée : seul le vendeur (ou l'admin) valide l'encaissement.

export const cashOnDelivery: PaymentProviderInterface = {
  code: "cod",
  label: { fr: "Paiement à la livraison", en: "Cash on delivery" },
  kind: "offline",
  supportsRefund: false,
  isConfigured: () => true,
  async initiate() {
    return { kind: "offline", instructions: "Vous payez le livreur ou le vendeur à la réception." };
  },
};

export const directToSeller: PaymentProviderInterface = {
  code: "direct",
  label: { fr: "Paiement direct au vendeur (Mobile Money, espèces)", en: "Pay the seller directly (Mobile Money, cash)" },
  kind: "offline",
  supportsRefund: false,
  isConfigured: () => true,
  async initiate() {
    return {
      kind: "offline",
      instructions: "Le vendeur vous contacte pour convenir du règlement. ECOM MARKET ne détient pas les fonds.",
    };
  },
};

export const manualValidation: PaymentProviderInterface = {
  code: "manual",
  label: { fr: "Virement / dépôt avec validation manuelle", en: "Transfer / deposit with manual validation" },
  kind: "offline",
  supportsRefund: false,
  isConfigured: () => true,
  async initiate() {
    return {
      kind: "offline",
      instructions: "Effectuez le paiement puis déclarez-le depuis le suivi de commande. Il sera validé après vérification.",
    };
  },
};
