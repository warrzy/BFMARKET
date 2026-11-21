// Architecture de paiement modulaire.
// Chaque prestataire implémente PaymentProviderInterface et est activé PAR PAYS
// via la table PaymentProviderConfig (administration > Paiements).

export type ProviderKind = "offline" | "online";

export interface InitiateParams {
  transactionId: string; // notre identifiant (idempotence)
  amount: number;
  currency: string;
  description: string;
  customer: { name: string; phone: string; email?: string | null };
  returnUrl: string;
  notifyUrl: string;
  mode: "test" | "live";
}

export type InitiateResult =
  | { kind: "redirect"; url: string; providerRef?: string }
  | { kind: "offline"; instructions: string };

export interface VerifiedStatus {
  status: "SUCCEEDED" | "PENDING" | "FAILED" | "CANCELLED";
  providerRef?: string;
  amount?: number;
  currency?: string;
  raw?: string;
}

export interface WebhookInput {
  headers: Headers;
  rawBody: string;
}

export interface PaymentProviderInterface {
  code: string;
  label: { fr: string; en: string };
  kind: ProviderKind;
  /** Le prestataire est-il configuré (clés présentes dans l'environnement) ? */
  isConfigured(): boolean;
  supportsRefund: boolean;
  initiate(params: InitiateParams): Promise<InitiateResult>;
  /**
   * Vérification CÔTÉ SERVEUR auprès du prestataire. Une notification (webhook) n'est
   * jamais crue sur parole : on extrait l'identifiant puis on interroge le prestataire.
   */
  verify?(transactionId: string, mode: "test" | "live"): Promise<VerifiedStatus>;
  /** Extrait de façon fiable l'identifiant de transaction et la clé d'événement d'un webhook. */
  parseWebhook?(input: WebhookInput): Promise<{ transactionId: string; eventKey: string } | null>;
  refund?(transactionId: string, amount: number): Promise<{ ok: boolean; message?: string }>;
}
