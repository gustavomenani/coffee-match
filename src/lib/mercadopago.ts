import { MercadoPagoConfig, Preference } from "mercadopago";
import { appBaseUrl, isProduction } from "@/lib/env";

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

export async function createTicketPreference(input: {
  ticketId: string;
  title: string;
  priceCents: number;
  payerEmail: string;
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
          currency_id: "BRL",
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
