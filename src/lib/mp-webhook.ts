import { createHmac, timingSafeEqual } from "crypto";

/**
 * How old a webhook's timestamp may be and still be accepted. The HMAC alone is
 * valid forever, so without this a single captured notification replays
 * indefinitely. MP's guidance is to enforce a ts window; 5 minutes covers
 * legitimate clock skew and retry latency.
 */
const MAX_SIGNATURE_AGE_MS = 5 * 60_000;

/**
 * Verify Mercado Pago webhook signature (x-signature + x-request-id).
 * @see https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
 */
export function verifyMercadoPagoSignature(input: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string;
  secret: string;
  /** Injectable for tests; defaults to now. */
  now?: number;
}): boolean {
  const { xSignature, xRequestId, dataId, secret, now = Date.now() } = input;
  if (!xSignature || !secret) return false;

  const parts = Object.fromEntries(
    xSignature.split(",").map((part) => {
      const [k, v] = part.split("=");
      return [k?.trim(), v?.trim()];
    })
  ) as Record<string, string | undefined>;

  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  // Reject stale (replayed) or future-dated timestamps. MP's ts is epoch
  // milliseconds; guard against a non-numeric value too.
  const tsMs = Number(ts);
  if (!Number.isFinite(tsMs) || Math.abs(now - tsMs) > MAX_SIGNATURE_AGE_MS) {
    return false;
  }

  // Template: id:[data.id];request-id:[x-request-id];ts:[ts];
  const manifest = `id:${dataId};request-id:${xRequestId ?? ""};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(v1, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
