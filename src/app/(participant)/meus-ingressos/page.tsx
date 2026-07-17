import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CancelPendingButton } from "@/components/tickets/cancel-pending-button";
import { formatDateTime as formatDate } from "@/lib/datetime";

const statusLabel: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

/* Badge do estado — cores por status, legíveis nos 2 temas */
const statusBadgeClass: Record<string, string> = {
  paid: "bg-[color-mix(in_srgb,var(--success)_14%,var(--paper-card))] text-[var(--success)]",
  pending:
    "bg-[color-mix(in_srgb,var(--champagne)_26%,var(--paper-card))] text-[var(--coffee-deep)]",
  cancelled: "bg-[var(--paper-deep)] text-[var(--muted)]",
  refunded: "bg-[var(--paper-deep)] text-[var(--muted)]",
};

const PAGE_SIZE = 20;

export default async function MeusIngressosPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const query = await searchParams;
  const requested = Number(query.page ?? "1");
  const page =
    Number.isFinite(requested) && requested >= 1 ? Math.floor(requested) : 1;

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where: { userId: session.user.id },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            venue: true,
            city: true,
            startsAt: true,
            endsAt: true,
            status: true,
            session: { select: { status: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.ticket.count({ where: { userId: session.user.id } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="eyebrow mb-3">Carteira</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-[var(--ink)] sm:text-5xl">
            Meus ingressos
          </h1>
          <p className="mt-3 text-base text-[var(--muted)]">
            QR da porta, votação e matches — tudo a partir daqui.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/meus-matches" className="btn btn-secondary !min-h-10 !text-sm">
            Meus matches
          </Link>
        </div>
      </div>

      {tickets.length === 0 ? (
        <div className="surface-card px-6 py-16 text-center">
          <p className="font-display text-2xl font-semibold text-[var(--ink)]">
            Nenhum ingresso ainda
          </p>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[var(--muted)]">
            Quando você garantir uma vaga, o ingresso e o QR aparecem aqui.
          </p>
          <Link href="/eventos" className="btn btn-primary mt-8">
            Ver noites
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {tickets.map((ticket) => (
            <li key={ticket.id} className="surface-card surface-card-hover p-6 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl font-semibold tracking-tight text-[var(--ink)]">
                    {ticket.event.title}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {ticket.event.venue} · {ticket.event.city}
                  </p>
                  <p className="mt-1 text-sm font-medium text-[var(--ink-soft)]">
                    {formatDate(ticket.event.startsAt)}
                  </p>
                </div>
                <span
                  className={`badge ${statusBadgeClass[ticket.status] ?? "badge-soft"}`}
                >
                  {statusLabel[ticket.status] ?? ticket.status}
                </span>
              </div>

              {ticket.checkedInAt ? (
                <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-[var(--success)]">
                  Check-in · {formatDate(ticket.checkedInAt)}
                </p>
              ) : ticket.status === "paid" ? (
                <p className="mt-4 text-xs font-medium text-[var(--muted)]">
                  Aguardando check-in na porta
                </p>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href={`/meus-ingressos/${ticket.id}`}
                  className="btn btn-primary !min-h-10 !px-4 !text-sm"
                >
                  Ver ingresso e QR
                </Link>
                {ticket.status === "paid" &&
                ticket.checkedInAt &&
                ticket.event.session?.status === "voting_open" ? (
                  <Link
                    href={`/evento/${ticket.event.id}/votar`}
                    className="btn btn-secondary !min-h-10 !px-4 !text-sm"
                  >
                    Votar
                  </Link>
                ) : null}
                {ticket.status === "paid" &&
                ticket.checkedInAt &&
                ticket.event.session?.status === "voting_closed" ? (
                  <Link
                    href={`/evento/${ticket.event.id}/matches`}
                    className="btn btn-secondary !min-h-10 !px-4 !text-sm"
                  >
                    Matches
                  </Link>
                ) : null}
                {ticket.status === "pending" ? (
                  <CancelPendingButton ticketId={ticket.id} />
                ) : null}
                <Link
                  href={`/eventos/${ticket.event.slug}`}
                  className="btn btn-ghost !min-h-10 !px-4 !text-sm"
                >
                  Evento
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 ? (
        <nav
          aria-label="Paginação de ingressos"
          className="mt-8 flex items-center justify-between gap-4"
        >
          {page > 1 ? (
            <Link
              href={`/meus-ingressos?page=${page - 1}`}
              className="btn btn-secondary !min-h-10 !px-4 !text-sm"
            >
              ← Anteriores
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-[var(--muted)]">
            Página {page} de {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={`/meus-ingressos?page=${page + 1}`}
              className="btn btn-secondary !min-h-10 !px-4 !text-sm"
            >
              Próximos →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </main>
  );
}
