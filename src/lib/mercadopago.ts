import {
  MercadoPagoConfig,
  PaymentRefund,
  PreApproval,
  Preference,
} from "mercadopago";
import { appBaseUrl, isProduction } from "@/lib/env";
import { SUBSCRIPTION_PRICE_CENTS } from "@/lib/domain/subscription";

export function getMpClient() {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("MERCADOPAGO_ACCESS_TOKEN missing");
  if (isProduction() && token.startsWith("TEST-DEV-BYPASS")) {
    throw new Error("Dev bypass token forbidden in production");
  }
  return new MercadoPagoConfig({ accessToken: token });
}

/**
 * Dev-only free checkout. Hard-blocked in production.
 * Requires ALLOW_DEV_BYPASS=1 and non-production NODE_ENV.
 */
export function isMpDevBypass(): boolean {
  if (isProduction()) return false;

  const allow =
    process.env.ALLOW_DEV_BYPASS === "1" ||
    process.env.ALLOW_DEV_BYPASS === "true";
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN ?? "";

  if (!allow) return false;
  return !token || token.startsWith("TEST-DEV-BYPASS");
}

/**
 * Total (full-amount) refund of a ticket payment on Mercado Pago.
 * In dev bypass mode no API call is made — returns a simulated ok.
 * Throws on API failure so callers can abort before mutating state.
 */
export async function refundTicketPayment(mpPaymentId: string): Promise<{
  simulated: boolean;
  refundId: number | null;
  status: string | null;
}> {
  if (isMpDevBypass()) {
    return { simulated: true, refundId: null, status: "approved" };
  }

  const refund = new PaymentRefund(getMpClient());
  // Full refund: SDK's total() posts to /v1/payments/{id}/refunds with no amount.
  const result = await refund.total({ payment_id: mpPaymentId });
  return {
    simulated: false,
    refundId: result.id ?? null,
    status: result.status ?? null,
  };
}

/** Create the R$10/month recurring subscription; buyer authorizes at init_point. */
export async function createSubscriptionPreapproval(input: {
  userId: string;
  payerEmail: string;
}): Promise<{ preapprovalId: string; initPoint: string }> {
  const preapproval = new PreApproval(getMpClient());
  const result = await preapproval.create({
    body: {
      reason: "Assinatura Coffee Match — Apoiador",
      external_reference: input.userId,
      payer_email: input.payerEmail,
      back_url: `${appBaseUrl()}/assinatura`,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: SUBSCRIPTION_PRICE_CENTS / 100,
        currency_id: "BRL",
      },
    },
  });
  if (!result.id || !result.init_point) {
    throw new Error("Preapproval sem id/init_point");
  }
  return { preapprovalId: result.id, initPoint: result.init_point };
}

export async function getPreapprovalStatus(
  preapprovalId: string
): Promise<{ status: string | null; externalReference: string | null }> {
  const result = await new PreApproval(getMpClient()).get({
    id: preapprovalId,
  });
  return {
    status: result.status ?? null,
    externalReference: result.external_reference ?? null,
  };
}

export async function cancelPreapproval(preapprovalId: string): Promise<void> {
  await new PreApproval(getMpClient()).update({
    id: preapprovalId,
    body: { status: "cancelled" },
  });
}

export async function createTicketPreference(input: {
  ticketId: string;
  title: string;
  priceCents: number;
  payerEmail: string;
  // The ticket's snapshot currency, threaded through so the charge cannot
  // disagree with what the webhook validates. Hardcoding "BRL" here while the
  // webhook checks payment.currency_id against ticket.currency meant a non-BRL
  // event (schema allows any currency) would charge BRL, fail webhook
  // validation, 200 with no MP retry, and strand the ticket — money captured,
  // no ticket. Passing it makes the two sides structurally consistent.
  currency: string;
}) {
  const preference = new Preference(getMpClient());
  const appUrl = appBaseUrl();
  const result = await preference.create({
    body: {
      items: [
        {
          id: input.ticketId,
          title: input.title,
          quantity: 1,
          unit_price: input.priceCents / 100,
          currency_id: input.currency,
        },
      ],
      payer: { email: input.payerEmail },
      external_reference: input.ticketId,
      back_urls: {
        success: `${appUrl}/pagamento/sucesso?ticket=${input.ticketId}`,
        pending: `${appUrl}/pagamento/pendente?ticket=${input.ticketId}`,
        failure: `${appUrl}/eventos`,
      },
      auto_return: "approved",
      notification_url: `${appUrl}/api/webhooks/mercadopago`,
    },
  });
  return result;
}
