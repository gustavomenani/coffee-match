import { MercadoPagoConfig, Preference } from "mercadopago";

export function getMpClient() {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("MERCADOPAGO_ACCESS_TOKEN missing");
  return new MercadoPagoConfig({ accessToken: token });
}

export function isMpDevBypass(): boolean {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  return !token || token.startsWith("TEST-DEV-BYPASS");
}

export async function createTicketPreference(input: {
  ticketId: string;
  title: string;
  priceCents: number;
  payerEmail: string;
}) {
  const preference = new Preference(getMpClient());
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
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
