import { auditLog } from "@/lib/audit";
import { appBaseUrl } from "@/lib/env";

/**
 * Transactional notifications.
 * Production: RESEND_API_KEY + EMAIL_FROM.
 * Dev: logs to console + audit trail so the product "works" end-to-end without external config.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Branded HTML shell — coffee palette, table-based for e-mail client support. */
function brandedHtml(input: {
  title: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
}): string {
  const cta =
    input.ctaLabel && input.ctaUrl
      ? `<tr><td align="center" style="padding:28px 0 8px">
          <a href="${escapeHtml(input.ctaUrl)}"
             style="display:inline-block;background:linear-gradient(165deg,#c9843f,#b87333);color:#fffaf5;text-decoration:none;font-weight:600;padding:13px 28px;border-radius:999px;font-family:Arial,Helvetica,sans-serif;font-size:15px">
            ${escapeHtml(input.ctaLabel)}
          </a>
        </td></tr>`
      : "";

  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background:#faf6f1">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf6f1;padding:32px 12px">
      <tr><td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
          <tr><td align="center" style="padding:0 0 20px">
            <div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;color:#1a100c">
              Coffee <span style="color:#b87333">Match</span>
            </div>
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#6b574c;margin-top:4px">
              Uma xícara por vez · 18+
            </div>
          </td></tr>
          <tr><td style="background:#fffdfb;border:1px solid rgba(26,16,12,0.08);border-radius:16px;padding:32px 30px">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#1a100c;padding-bottom:14px">
                ${escapeHtml(input.title)}
              </td></tr>
              <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:#3d2e26">
                ${input.bodyHtml}
              </td></tr>
              ${cta}
            </table>
          </td></tr>
          <tr><td align="center" style="padding:20px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#6b574c">
            Coffee Match — conectando pessoas, uma xícara por vez.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

/**
 * Sends an e-mail and reports whether it actually went out.
 *
 * Never throws: a dead mail provider must not break a payment webhook or a
 * cron mid-loop. But callers still need the truth, because two things depend
 * on it — the audit trail (the only evidence when a buyer says "I paid and got
 * nothing") and the dedup markers (reminderSentAt, notifiedAt), which
 * permanently suppress a retry once set.
 *
 * Returns true only when the provider accepted the message, or when running
 * without Resend configured (console channel — nothing to fail).
 */
export async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  auditAction: string;
  auditMeta?: Record<string, unknown>;
}): Promise<boolean> {
  const viaResend = !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  let delivered = true;
  let providerId: string | null = null;
  let failure: string | null = null;

  if (viaResend) {
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
          subject: input.subject,
          text: input.text,
          ...(input.html ? { html: input.html } : {}),
        }),
      });
      if (res.ok) {
        providerId = await res
          .json()
          .then((b) => (typeof b?.id === "string" ? b.id : null))
          .catch(() => null);
      } else {
        delivered = false;
        failure = `http_${res.status}`;
        console.error("[notify] resend failed", res.status, await res.text());
      }
    } catch (err) {
      delivered = false;
      failure = "network_error";
      console.error("[notify] resend error", err);
    }
  } else {
    console.info("[notify:email:dev]", { to: input.to, subject: input.subject });
    console.info(input.text);
  }

  await auditLog({
    action: input.auditAction,
    meta: {
      to: input.to,
      ...input.auditMeta,
      channel: viaResend ? "resend" : "console",
      delivered,
      ...(providerId ? { providerId } : {}),
      ...(failure ? { failure } : {}),
    },
  });

  return delivered;
}

export async function sendTicketPaidEmail(input: {
  to: string;
  eventTitle: string;
  eventWhen: string;
  venue: string;
  ticketId: string;
}): Promise<boolean> {
  const subject = `Ingresso confirmado — ${input.eventTitle} | Coffee Match`;
  const ticketUrl = `${appBaseUrl()}/meus-ingressos/${input.ticketId}`;

  const text = [
    `Olá!`,
    ``,
    `Seu ingresso para "${input.eventTitle}" está confirmado.`,
    `Quando: ${input.eventWhen}`,
    `Local: ${input.venue}`,
    `Código: ${input.ticketId}`,
    ``,
    `Veja o QR do seu ingresso: ${ticketUrl}`,
    ``,
    `Dica: complete seu perfil com foto e bio em ${appBaseUrl()}/minha-conta — é o que aparece na hora da votação.`,
    ``,
    `Coffee Match — conectando pessoas, uma xícara por vez.`,
  ].join("\n");

  const html = brandedHtml({
    title: "Seu ingresso está confirmado ✓",
    bodyHtml: [
      `<p style="margin:0 0 12px">Prepare o melhor assunto da semana — sua vaga está garantida.</p>`,
      `<p style="margin:0 0 4px"><strong>Evento:</strong> ${escapeHtml(input.eventTitle)}</p>`,
      `<p style="margin:0 0 4px"><strong>Quando:</strong> ${escapeHtml(input.eventWhen)}</p>`,
      `<p style="margin:0 0 4px"><strong>Local:</strong> ${escapeHtml(input.venue)}</p>`,
      `<p style="margin:12px 0 0;font-size:12px;color:#6b574c">Código do ingresso: <code>${escapeHtml(input.ticketId)}</code></p>`,
      `<p style="margin:12px 0 0">Dica: complete seu perfil com foto e bio em <a href="${appBaseUrl()}/minha-conta" style="color:#b87333">/minha-conta</a> — é o que aparece na hora da votação.</p>`,
    ].join(""),
    ctaLabel: "Ver ingresso e QR",
    ctaUrl: ticketUrl,
  });

  return sendEmail({
    to: input.to,
    subject,
    text,
    html,
    auditAction: "notify.ticket_paid",
    auditMeta: { ticketId: input.ticketId, eventTitle: input.eventTitle },
  });
}

export async function sendEventReminderEmail(input: {
  to: string;
  eventTitle: string;
  eventWhen: string;
  venue: string;
  ticketId: string;
}): Promise<boolean> {
  const subject = `É amanhã! ${input.eventTitle} | Coffee Match`;
  const ticketUrl = `${appBaseUrl()}/meus-ingressos/${input.ticketId}`;

  const text = [
    `Olá!`,
    ``,
    `Amanhã tem "${input.eventTitle}" — e a sua xícara já tem lugar reservado.`,
    `Quando: ${input.eventWhen}`,
    `Onde: ${input.venue}`,
    ``,
    `Ver meu ingresso e QR: ${ticketUrl}`,
    ``,
    `Chegue 15 minutos antes para o check-in tranquilo.`,
    `Aproveite para completar seu perfil com foto e bio em ${appBaseUrl()}/minha-conta — é o que aparece na hora da votação.`,
    ``,
    `Coffee Match — conectando pessoas, uma xícara por vez.`,
  ].join("\n");

  const html = brandedHtml({
    title: "É amanhã! ☕",
    bodyHtml: [
      `<p style="margin:0 0 12px">Amanhã tem <strong>${escapeHtml(input.eventTitle)}</strong> — e a sua xícara já tem lugar reservado.</p>`,
      `<p style="margin:0 0 4px"><strong>Quando:</strong> ${escapeHtml(input.eventWhen)}</p>`,
      `<p style="margin:0 0 4px"><strong>Onde:</strong> ${escapeHtml(input.venue)}</p>`,
      `<p style="margin:12px 0 0">Chegue <strong>15 minutos antes</strong> para o check-in tranquilo.</p>`,
      `<p style="margin:12px 0 0">Aproveite para completar seu perfil com foto e bio em <a href="${appBaseUrl()}/minha-conta" style="color:#b87333">/minha-conta</a> — é o que aparece na hora da votação.</p>`,
    ].join(""),
    ctaLabel: "Ver meu ingresso e QR",
    ctaUrl: ticketUrl,
  });

  return sendEmail({
    to: input.to,
    subject,
    text,
    html,
    auditAction: "notify.event_reminder",
    auditMeta: { ticketId: input.ticketId, eventTitle: input.eventTitle },
  });
}

export async function sendSpotOpenedEmail(input: {
  to: string;
  eventTitle: string;
  eventSlug: string;
  city: string;
}): Promise<boolean> {
  const subject = `Abriu vaga! ${input.eventTitle} | Coffee Match`;
  const eventUrl = `${appBaseUrl()}/eventos/${input.eventSlug}`;

  const text = [
    `Olá!`,
    ``,
    `Uma vaga acabou de abrir em "${input.eventTitle}" (${input.city}).`,
    `Corra que é por ordem de chegada — quando lotar, lotou.`,
    ``,
    `Garantir minha vaga: ${eventUrl}`,
    ``,
    `Coffee Match — conectando pessoas, uma xícara por vez.`,
  ].join("\n");

  const html = brandedHtml({
    title: "Abriu vaga! ☕",
    bodyHtml: [
      `<p style="margin:0 0 12px">Uma vaga acabou de abrir em <strong>${escapeHtml(input.eventTitle)}</strong> (${escapeHtml(input.city)}).</p>`,
      `<p style="margin:0">Corra que é por ordem de chegada — quando lotar, lotou.</p>`,
    ].join(""),
    ctaLabel: "Garantir minha vaga",
    ctaUrl: eventUrl,
  });

  return sendEmail({
    to: input.to,
    subject,
    text,
    html,
    auditAction: "notify.spot_opened",
    auditMeta: { eventSlug: input.eventSlug, eventTitle: input.eventTitle },
  });
}

export async function sendMatchesReadyEmail(input: {
  to: string;
  eventTitle: string;
  eventId: string;
  matchCount: number;
}): Promise<boolean> {
  const subject = `Seus resultados saíram — ${input.eventTitle} | Coffee Match`;
  const matchesUrl = `${appBaseUrl()}/evento/${input.eventId}/matches`;
  const headline =
    input.matchCount > 0
      ? `Você tem ${input.matchCount} match${input.matchCount > 1 ? "es" : ""}!`
      : "A votação foi encerrada";

  const text = [
    `Olá!`,
    ``,
    input.matchCount > 0
      ? `Boa notícia: você tem ${input.matchCount} match(es) em "${input.eventTitle}".`
      : `A votação de "${input.eventTitle}" foi encerrada.`,
    `Veja seus resultados e contatos: ${matchesUrl}`,
    ``,
    `Coffee Match — conectando pessoas, uma xícara por vez.`,
  ].join("\n");

  const html = brandedHtml({
    title: headline,
    bodyHtml:
      input.matchCount > 0
        ? `<p style="margin:0">As pessoas que você marcou <strong>Sim</strong> também marcaram você. O WhatsApp de cada match já está liberado na sua página de resultados.</p>`
        : `<p style="margin:0">A votação de <strong>${escapeHtml(input.eventTitle)}</strong> foi encerrada. Veja seus resultados — e até a próxima xícara.</p>`,
    ctaLabel: "Ver meus matches",
    ctaUrl: matchesUrl,
  });

  return sendEmail({
    to: input.to,
    subject,
    text,
    html,
    auditAction: "notify.matches_ready",
    auditMeta: { eventId: input.eventId, matchCount: input.matchCount },
  });
}
