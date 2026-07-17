/**
 * Structured logging.
 *
 * Every failure path in this app was a bare `console.error("[tag] msg", err)`.
 * That is unsearchable and unalertable: when the Mercado Pago webhook fails at
 * 23:00 on an event night, the only trace is a line in an ephemeral serverless
 * log nobody is watching, and you find out when a customer complains.
 *
 * This does not add a vendor. It gives failures ONE shape — a JSON line with a
 * stable `event` name and context — so they can be grepped, alerted on, and
 * counted today, and so wiring Sentry/Datadog/OTel later is a change in exactly
 * one place (`emit` below) rather than across 30 call sites.
 *
 * Never throws: observability must not be able to break the thing it observes.
 */

export type LogContext = Record<string, unknown>;

type Level = "error" | "warn" | "info";

/** Keys whose values must never reach a log line. */
const REDACTED_KEYS = new Set([
  "password",
  "passwordhash",
  "token",
  "tokenhash",
  "secret",
  "authorization",
  "accesstoken",
]);

function redact(context: LogContext): LogContext {
  const out: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    out[key] = REDACTED_KEYS.has(key.toLowerCase()) ? "[redacted]" : value;
  }
  return out;
}

function serializeError(err: unknown): LogContext {
  if (err instanceof Error) {
    return {
      errorName: err.name,
      errorMessage: err.message,
      // `digest` is how Next identifies an error that React re-threw during
      // Server Component rendering — without it the real cause is unfindable.
      ...("digest" in err ? { digest: String(err.digest) } : {}),
      stack: err.stack,
    };
  }
  return { errorMessage: String(err) };
}

function emit(level: Level, event: string, context: LogContext): void {
  try {
    const line = JSON.stringify({
      level,
      event,
      at: new Date().toISOString(),
      ...redact(context),
    });
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.info(line);
  } catch {
    // A context object that cannot be serialized (a cycle, a BigInt) must not
    // take down the request that was already failing.
    console.error(`{"level":"${level}","event":"${event}","logFailed":true}`);
  }
}

/**
 * An operation failed. `event` is a stable dot-separated name you can alert on
 * (e.g. "mp_webhook.processing_failed"), not a prose message.
 */
export function logError(
  event: string,
  err: unknown,
  context: LogContext = {}
): void {
  emit("error", event, { ...context, ...serializeError(err) });
}

/** Something is wrong but the request survived (degraded, retried, skipped). */
export function logWarn(event: string, context: LogContext = {}): void {
  emit("warn", event, context);
}

/** A notable business event worth counting. */
export function logInfo(event: string, context: LogContext = {}): void {
  emit("info", event, context);
}

/**
 * A money/data anomaly a human must act on NOW — "payment captured but no
 * ticket", a duplicate charge, a duplicate preapproval. These paths were
 * deliberately built to detect-and-log rather than auto-remediate, which is only
 * safe if someone is actually paged. This logs at error level AND best-effort
 * POSTs to ALERT_WEBHOOK_URL (Slack/Discord/generic incoming webhook).
 *
 * Fire-and-forget with a hard timeout, and swallows everything: an alert channel
 * being down must never turn a recoverable money anomaly into a crashed webhook
 * (which Mercado Pago would then retry, compounding the problem).
 */
export function alertCritical(event: string, context: LogContext = {}): void {
  emit("error", event, { ...context, critical: true });
  void dispatchAlert(event, redact(context));
}

async function dispatchAlert(event: string, context: LogContext): Promise<void> {
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url) return; // logged already; webhook is optional
  try {
    const summary = Object.entries(context)
      .map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`)
      .join(" ");
    const text = `🚨 coffee-match CRITICAL: ${event}\n${summary}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    try {
      await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        // Both keys so one payload works for Slack ("text") and Discord
        // ("content") incoming webhooks; each ignores the other's field.
        body: JSON.stringify({ text, content: text }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    // Alert delivery failed; the error-level log line above is the fallback.
  }
}
