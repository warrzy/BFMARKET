import type { PaymentProviderInterface, VerifiedStatus } from "../types";

// CinetPay — API Checkout v2 (https://docs.cinetpay.com).
// Initialisation : POST https://api-checkout.cinetpay.com/v2/payment
// Vérification   : POST https://api-checkout.cinetpay.com/v2/payment/check
// La notification (notify_url) transmet `cpm_trans_id` ; on revérifie TOUJOURS le statut
// via /payment/check avant toute mise à jour. À valider en environnement de test CinetPay
// avant activation en production.

const BASE = "https://api-checkout.cinetpay.com/v2";

const env = () => ({ apikey: process.env.CINETPAY_API_KEY ?? "", site_id: process.env.CINETPAY_SITE_ID ?? "" });

export const cinetpay: PaymentProviderInterface = {
  code: "cinetpay",
  label: { fr: "Mobile Money / carte (CinetPay)", en: "Mobile Money / card (CinetPay)" },
  kind: "online",
  supportsRefund: false,
  isConfigured: () => !!(process.env.CINETPAY_API_KEY && process.env.CINETPAY_SITE_ID),

  async initiate(p) {
    const res = await fetch(`${BASE}/payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...env(),
        transaction_id: p.transactionId,
        amount: p.amount,
        currency: p.currency,
        description: p.description.replace(/[^\p{L}\p{N} .,-]/gu, "").slice(0, 120),
        notify_url: p.notifyUrl,
        return_url: p.returnUrl,
        channels: "ALL",
        customer_name: p.customer.name,
        customer_phone_number: p.customer.phone,
        customer_email: p.customer.email ?? undefined,
      }),
      signal: AbortSignal.timeout(15000),
    });
    const json = (await res.json().catch(() => null)) as { code?: string; message?: string; data?: { payment_url?: string } } | null;
    if (!res.ok || json?.code !== "201" || !json.data?.payment_url) {
      throw new Error(`CinetPay: initialisation refusée (${json?.message ?? res.status})`);
    }
    return { kind: "redirect", url: json.data.payment_url };
  },

  async verify(transactionId): Promise<VerifiedStatus> {
    const res = await fetch(`${BASE}/payment/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...env(), transaction_id: transactionId }),
      signal: AbortSignal.timeout(15000),
    });
    const json = (await res.json().catch(() => null)) as
      | { code?: string; data?: { status?: string; amount?: string | number; currency?: string; operator_id?: string } }
      | null;
    const s = json?.data?.status;
    return {
      status: s === "ACCEPTED" ? "SUCCEEDED" : s === "REFUSED" ? "FAILED" : s === "CANCELED" ? "CANCELLED" : "PENDING",
      amount: json?.data?.amount != null ? Number(json.data.amount) : undefined,
      currency: json?.data?.currency,
      providerRef: json?.data?.operator_id,
      raw: s ?? json?.code,
    };
  },

  async parseWebhook({ rawBody }) {
    const params = new URLSearchParams(rawBody);
    const id = params.get("cpm_trans_id");
    if (!id) return null;
    return { transactionId: id, eventKey: `${id}:${params.get("cpm_trans_date") ?? ""}` };
  },
};
