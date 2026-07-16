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
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <Link
        href="/eventos"
        className="mb-8 inline-flex text-sm font-semibold text-[var(--muted)] transition-colors hover:text-[var(--carmine)]"
      >
        ← Voltar à agenda
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="badge badge-live">
              {statusLabel[event.status] ?? event.status}
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
              {event.city}
            </span>
          </div>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-[var(--ink)] sm:text-5xl">
            {event.title}
          </h1>

          <dl className="mt-10 space-y-6">
            <div className="surface-card p-5">
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--champagne)]">
                Quando
              </dt>
              <dd className="mt-2 text-base text-[var(--ink-soft)]">
                {formatDate(event.startsAt)}
                <span className="mt-1 block text-sm text-[var(--muted)]">
                  até {formatDate(event.endsAt)}
                </span>
              </dd>
            </div>
            <div className="surface-card p-5">
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--champagne)]">
                Local
              </dt>
              <dd className="mt-2 text-base text-[var(--ink-soft)]">
                <span className="font-semibold text-[var(--ink)]">{event.venue}</span>
                <br />
                {event.address}, {event.city}
              </dd>
            </div>
            <div className="surface-card p-5">
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--champagne)]">
                Vagas restantes
              </dt>
              <dd className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-[var(--radius-sm)] bg-[var(--paper-deep)] px-4 py-3">
                  <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
                    Homens
                  </p>
                  <p className="font-display text-2xl font-semibold tabular text-[var(--ink)]">
                    {Math.max(0, event.remainingMen)}
                    <span className="text-base text-[var(--muted)]">
                      /{event.capacityMen}
                    </span>
                  </p>
                </div>
                <div className="rounded-[var(--radius-sm)] bg-[var(--paper-deep)] px-4 py-3">
                  <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
                    Mulheres
                  </p>
                  <p className="font-display text-2xl font-semibold tabular text-[var(--ink)]">
                    {Math.max(0, event.remainingWomen)}
                    <span className="text-base text-[var(--muted)]">
                      /{event.capacityWomen}
                    </span>
                  </p>
                </div>
              </dd>
            </div>
          </dl>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="surface-card overflow-hidden">
            <div className="border-b border-[var(--line)] bg-[linear-gradient(165deg,#1c1014,#2a1219)] px-6 py-7 text-[#f8f1ec]">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[var(--champagne-light)]">
                Ingresso
              </p>
              <p className="font-display mt-2 text-4xl font-semibold tabular">
                {formatBRL(event.priceCents)}
              </p>
              <p className="mt-2 text-sm text-[color-mix(in_srgb,#f8f1ec_65%,transparent)]">
                Pagamento com Pix ou cartão
              </p>
            </div>
            <div className="space-y-5 p-6">
              {canBuy ? (
                <BuyTicketButton eventId={event.id} />
              ) : (
                <p className="rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--paper-deep)] px-4 py-3 text-sm text-[var(--muted)]">
                  {event.status === "sold_out" ||
                  (event.remainingMen <= 0 && event.remainingWomen <= 0)
                    ? "Ingressos esgotados para este evento."
                    : "Compra indisponível no momento."}
                </p>
              )}
              <div className="space-y-2 text-sm leading-relaxed text-[var(--muted)]">
                <p>
                  Evento <strong className="text-[var(--ink-soft)]">18+</strong>.
                  Ao comprar, você concorda com as{" "}
                  <Link
                    href="/regras"
                    className="font-semibold text-[var(--carmine)] underline-offset-2 hover:underline"
                  >
                    regras
                  </Link>
                  .
                </p>
                <p>
                  Condições de{" "}
                  <Link
                    href="/reembolso"
                    className="font-semibold text-[var(--carmine)] underline-offset-2 hover:underline"
                  >
                    reembolso
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
