import Link from "next/link";
import { notFound } from "next/navigation";
import { BuyTicketButton } from "@/components/events/event-card";
import { getEventBySlug } from "@/lib/actions/events";

export const dynamic = "force-dynamic";

function formatBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(value);
}

const statusLabel: Record<string, string> = {
  published: "Aberto para compra",
  sold_out: "Esgotado",
  live: "Em andamento",
  closed: "Encerrado",
};

export default async function EventoDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const canBuy =
    event.status === "published" &&
    (event.remainingMen > 0 || event.remainingWomen > 0);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <Link
        href="/eventos"
        className="mb-6 inline-block text-sm font-medium text-zinc-600 hover:text-zinc-900"
      >
        ← Voltar aos eventos
      </Link>

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold text-zinc-900">{event.title}</h1>
        <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
          {statusLabel[event.status] ?? event.status}
        </span>
      </div>

      <dl className="mt-6 space-y-3 text-sm">
        <div>
          <dt className="font-medium text-zinc-800">Quando</dt>
          <dd className="text-zinc-600">
            {formatDate(event.startsAt)} — {formatDate(event.endsAt)}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-800">Local</dt>
          <dd className="text-zinc-600">
            {event.venue}
            <br />
            {event.address}, {event.city}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-800">Preço</dt>
          <dd className="text-lg font-semibold text-zinc-900">
            {formatBRL(event.priceCents)}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-800">Vagas restantes</dt>
          <dd className="text-zinc-600">
            Homens: {Math.max(0, event.remainingMen)} / {event.capacityMen}
            <br />
            Mulheres: {Math.max(0, event.remainingWomen)} / {event.capacityWomen}
          </dd>
        </div>
      </dl>

      <div className="mt-8 border-t border-zinc-200 pt-6">
        {canBuy ? (
          <BuyTicketButton eventId={event.id} />
        ) : (
          <p className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
            {event.status === "sold_out" ||
            (event.remainingMen <= 0 && event.remainingWomen <= 0)
              ? "Ingressos esgotados para este evento."
              : "Compra indisponível no momento."}
          </p>
        )}
      </div>
    </main>
  );
}
