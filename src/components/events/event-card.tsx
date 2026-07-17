"use client";

import Link from "next/link";
import { formatBRL } from "@/lib/format";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { APP_TZ, formatWeekdayTime } from "@/lib/datetime";

export type EventCardData = {
  title: string;
  slug: string;
  city: string;
  venue: string;
  startsAt: Date | string;
  priceCents: number;
  remainingMen: number;
  remainingWomen: number;
  status: string;
};

function formatDate(value: Date | string) {
  const d = typeof value === "string" ? new Date(value) : value;
  return formatWeekdayTime(d);
}

const spDayParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Número do dia-calendário de São Paulo (dias desde a época), para comparar datas. */
function spDayNumber(d: Date): number {
  const [y, m, day] = spDayParts.format(d).split("-").map(Number);
  return Date.UTC(y, m - 1, day) / 86_400_000;
}

function relativeLabel(value: Date | string) {
  const d = typeof value === "string" ? new Date(value) : value;
  // Compara dias-calendário no fuso do evento (SP), não diff bruto de ms.
  const days = spDayNumber(d) - spDayNumber(new Date());
  if (days < 0) return "Passado";
  if (days === 0) return "Hoje";
  if (days === 1) return "Amanhã";
  if (days <= 7) return `Em ${days} dias`;
  return null;
}

const statusLabel: Record<string, string> = {
  published: "Aberto",
  sold_out: "Esgotado",
  live: "Ao vivo",
  closed: "Encerrado",
  draft: "Rascunho",
};

export function EventCard({ event }: { event: EventCardData }) {
  const when = relativeLabel(event.startsAt);

  return (
    <Link
      href={`/eventos/${event.slug}`}
      className="surface-card surface-card-hover group block overflow-hidden"
    >
      <div className="h-1.5 w-full bg-gradient-to-r from-[var(--coffee-deep)] via-[var(--coffee)] to-[var(--champagne)]" />
      <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-stretch sm:justify-between sm:p-7">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="badge badge-live">
              {statusLabel[event.status] ?? event.status}
            </span>
            {when ? (
              // Rótulo depende de Date.now() e pode divergir entre SSR e cliente na virada do dia
              <span suppressHydrationWarning className="badge badge-soft">
                {when}
              </span>
            ) : null}
            <span className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
              {event.city}
            </span>
          </div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-[var(--ink)] transition-colors group-hover:text-[var(--coffee)] sm:text-[1.7rem]">
            {event.title}
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">{event.venue}</p>
          <p className="mt-1 text-sm font-medium text-[var(--ink-soft)]">
            {formatDate(event.startsAt)}
          </p>
        </div>

        <div className="flex shrink-0 flex-col justify-between gap-4 border-t border-[var(--line)] pt-4 sm:min-w-[10rem] sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
          <p className="font-display text-3xl font-semibold tabular tracking-tight text-[var(--ink)]">
            {formatBRL(event.priceCents)}
          </p>
          <div className="space-y-1 text-xs leading-relaxed text-[var(--muted)]">
            <p>
              Homens ·{" "}
              <span
                className={`font-semibold tabular ${
                  event.remainingMen <= 0
                    ? "text-[var(--danger)]"
                    : "text-[var(--ink-soft)]"
                }`}
              >
                {Math.max(0, event.remainingMen)}
              </span>
            </p>
            <p>
              Mulheres ·{" "}
              <span
                className={`font-semibold tabular ${
                  event.remainingWomen <= 0
                    ? "text-[var(--danger)]"
                    : "text-[var(--ink-soft)]"
                }`}
              >
                {Math.max(0, event.remainingWomen)}
              </span>
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--accent-text)]">
            Ver detalhes{" "}
            <span
              aria-hidden
              className="inline-block transition-transform group-hover:translate-x-0.5"
            >
              →
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}

/** Client CTA: POST /api/checkout with { eventId } */
export function BuyTicketButton({
  eventId,
  disabled,
}: {
  eventId: string;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleBuy() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        initPoint?: string;
        url?: string;
        error?: string;
      };
      if (res.status === 401) {
        window.location.href =
          "/login?callbackUrl=" +
          encodeURIComponent(window.location.pathname);
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Não foi possível iniciar o checkout.");
        return;
      }
      const payUrl = data.initPoint ?? data.url;
      if (payUrl) {
        window.location.href = payUrl;
        return;
      }
      setError("Checkout sem URL de pagamento.");
    } catch {
      setError("Falha de rede ao chamar checkout.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        onClick={handleBuy}
        disabled={disabled || loading}
        className="w-full sm:w-auto"
      >
        {loading ? "Processando…" : "Garantir ingresso"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm font-medium text-[var(--danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
