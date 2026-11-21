import type { PaymentProviderInterface, VerifiedStatus } from "../types";

// PayDunya — Checkout Invoice (https://developers.paydunya.com).
// Création     : POST {base}/checkout-invoice/create
// Confirmation : GET  {base}/checkout-invoice/confirm/{token}
// base = https://app.paydunya.com/sandbox-api/v1 (test) ou https://app.paydunya.com/api/v1 (live)
// L'IPN contient le token de facture ; le statut est revérifié via /confirm.
// À valider en sandbox PayDunya avant activation en production.

const base = (mode: "test" | "live") =>
  mode === "live" ? "https://app.paydunya.com/api/v1" : "https://app.paydunya.com/sandbox-api/v1";

const headers = () => ({
  "Content-Type": "application/json",
  "PAYDUNYA-MASTER-KEY": process.env.PAYDUNYA_MASTER_KEY ?? "",
  "PAYDUNYA-PRIVATE-KEY": process.env.PAYDUNYA_PRIVATE_KEY ?? "",
  "PAYDUNYA-TOKEN": process.env.PAYDUNYA_TOKEN ?? "",
});

export const paydunya: PaymentProviderInterface = {
  code: "paydunya",
  label: { fr: "Mobile Money / carte (PayDunya)", en: "Mobile Money / card (PayDunya)" },
  kind: "online",
  supportsRefund: false,
  isConfigured: () => !!(process.env.PAYDUNYA_MASTER_KEY && process.env.PAYDUNYA_PRIVATE_KEY && process.env.PAYDUNYA_TOKEN),

  async initiate(p) {
    const res = await fetch(`${base(p.mode)}/checkout-invoice/create`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        invoice: { total_amount: p.amount, description: p.description.slice(0, 120) },
        store: { name: "ECOM MARKET" },
        actions: { callback_url: p.notifyUrl, return_url: p.returnUrl, cancel_url: p.returnUrl },
        custom_data: { transaction_id: p.transactionId },
      }),
      signal: AbortSignal.timeout(15000),
    });
    const json = (await res.json().catch(() => null)) as { response_code?: string; response_text?: string; token?: string } | null;
    if (json?.response_code !== "00" || !json.response_text) {
      throw new Error(`PayDunya: création de facture refusée (${json?.response_text ?? res.status})`);
    }
    return { kind: "redirect", url: json.response_text, providerRef: json.token };
  },

  async verify(providerToken, mode): Promise<VerifiedStatus> {
    const res = await fetch(`${base(mode)}/checkout-invoice/confirm/${encodeURIComponent(providerToken)}`, {
      headers: headers(),
      signal: AbortSignal.timeout(15000),
    });
    const json = (await res.json().catch(() => null)) as
      | { status?: string; invoice?: { total_amount?: number | string } }
      | null;
    const s = json?.status;
    return {
      status: s === "completed" ? "SUCCEEDED" : s === "cancelled" ? "CANCELLED" : s === "failed" ? "FAILED" : "PENDING",
      amount: json?.invoice?.total_amount != null ? Number(json.invoice.total_amount) : undefined,
      providerRef: providerToken,
      raw: s,
    };
  },

  async parseWebhook({ rawBody }) {
    // L'IPN PayDunya est envoyé en application/x-www-form-urlencoded avec data[invoice][token]
    const params = new URLSearchParams(rawBody);
    const token = params.get("data[invoice][token]");
    const txId = params.get("data[custom_data][transaction_id]");
    if (!token || !txId) return null;
    return { transactionId: txId, eventKey: `${token}:${params.get("data[status]") ?? ""}` };
  },
};
