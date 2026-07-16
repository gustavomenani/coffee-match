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
    dateStyle: "full",
    timeStyle: "short",
  }).format(d);
}

const statusLabel: Record<string, string> = {
  published: "Aberto",
  sold_out: "Esgotado",
  live: "Ao vivo",
  closed: "Encerrado",
  draft: "Rascunho",
};

export function EventCard({ event }: { event: EventCardData }) {
  return (
    <Link
      href={`/eventos/${event.slug}`}
      className="block rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-400 hover:shadow-md"
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-900">{event.title}</h2>
        <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
          {statusLabel[event.status] ?? event.status}
        </span>
      </div>
      <p className="text-sm text-zinc-600">
        {event.city} · {event.venue}
      </p>
      <p className="mt-1 text-sm text-zinc-600">{formatDate(event.startsAt)}</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-base font-semibold text-zinc-900">
          {formatBRL(event.priceCents)}
        </p>
        <p className="text-xs text-zinc-500">
          Vagas: {Math.max(0, event.remainingMen)} H ·{" "}
          {Math.max(0, event.remainingWomen)} M
        </p>
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
        {loading ? "Processando…" : "Comprar ingresso"}
      </Button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
