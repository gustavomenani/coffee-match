"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";

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

function formatBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatDate(value: Date | string) {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function relativeLabel(value: Date | string) {
  const d = typeof value === "string" ? new Date(value) : value;
  const diff = d.getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
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
      <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-stretch sm:justify-between sm:p-7">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="badge badge-live">
              {statusLabel[event.status] ?? event.status}
            </span>
            {when ? <span className="badge badge-soft">{when}</span> : null}
            <span className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
              {event.city}
            </span>
          </div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-[var(--ink)] transition-colors group-hover:text-[var(--carmine)] sm:text-[1.7rem]">
            {event.title}
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {event.venue}
          </p>
          <p className="mt-1 text-sm font-medium text-[var(--ink-soft)]">
            {formatDate(event.startsAt)}
          </p>
        </div>

        <div className="flex shrink-0 flex-col justify-between gap-4 border-t border-[var(--line)] pt-4 sm:min-w-[9.5rem] sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
          <p className="font-display text-3xl font-semibold tabular tracking-tight text-[var(--ink)]">
            {formatBRL(event.priceCents)}
          </p>
          <p className="text-xs leading-relaxed text-[var(--muted)]">
            Vagas ·{" "}
            <span className="font-semibold text-[var(--ink-soft)]">
              {Math.max(0, event.remainingMen)} H
            </span>{" "}
            ·{" "}
            <span className="font-semibold text-[var(--ink-soft)]">
              {Math.max(0, event.remainingWomen)} M
            </span>
          </p>
          <span className="text-sm font-semibold text-[var(--carmine)]">
            Ver detalhes →
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
        <p className="text-sm font-medium text-[var(--danger)]">{error}</p>
      ) : null}
    </div>
  );
}
