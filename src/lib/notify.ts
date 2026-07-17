import { auditLog } from "@/lib/audit";

/**
 * Transactional notifications.
 * Production: wire RESEND_API_KEY / SMTP later.
 * Dev: logs to console + audit trail so the product "works" end-to-end without external config.
 */
export async function sendTicketPaidEmail(input: {
  to: string;
  eventTitle: string;
  eventWhen: string;
  venue: string;
  ticketId: string;
}): Promise<void> {
  const subject = `Ingresso confirmado — ${input.eventTitle} | Coffee Match`;
  const body = [
    `Olá!`,
    ``,
    `Seu ingresso para "${input.eventTitle}" está confirmado.`,
    `Quando: ${input.eventWhen}`,
    `Local: ${input.venue}`,
    `Código: ${input.ticketId}`,
    ``,
    `Mostre o QR em /meus-ingressos no dia do evento.`,
    ``,
    `Coffee Match — conectando pessoas, uma xícara por vez.`,
  ].join("\n");

  if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM,
          to: input.to,
          subject,
          text: body,
        }),
      });
      if (!res.ok) {
        console.error("[notify] resend failed", await res.text());
      }
    } catch (err) {
      console.error("[notify] resend error", err);
    }
  } else {
    console.info("[notify:email:dev]", { to: input.to, subject });
    console.info(body);
  }

  await auditLog({
    action: "notify.ticket_paid",
    meta: {
      to: input.to,
      ticketId: input.ticketId,
      eventTitle: input.eventTitle,
      channel: process.env.RESEND_API_KEY ? "resend" : "console",
    },
  });
}
