import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime as formatDate } from "@/lib/datetime";

const statusLabel: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

export default async function PagamentoSucessoPage({
  searchParams,
}: {
  searchParams: Promise<{ ticket?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const params = await searchParams;
  const ticketId = params.ticket;

  const ticket = ticketId
    ? await prisma.ticket.findFirst({
        where: { id: ticketId, userId: session.user.id },
        include: {
          event: {
            select: {
              title: true,
              slug: true,
              venue: true,
              city: true,
              startsAt: true,
            },
          },
        },
      })
    : null;

  const heading =
    ticket?.status === "paid"
      ? "Pagamento confirmado"
      : ticket?.status === "pending"
        ? "Quase lá"
        : "Pagamento";

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-xl">
        <p className="eyebrow mb-3">Checkout</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-[var(--ink)] sm:text-5xl">
          {heading}
        </h1>

        {!ticket ? (
          <div className="surface-card mt-8 px-6 py-12 text-center">
            <p className="font-display text-2xl font-semibold text-[var(--ink)]">
              Ingresso não encontrado
            </p>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[var(--muted)]">
              Verifique em Meus ingressos ou volte para a lista de noites.
            </p>
          </div>
        ) : (
          <div className="surface-card mt-8 p-6 sm:p-7">
            {ticket.status === "paid" ? (
              <p
                role="status"
                className="flash-success mb-4 rounded-[var(--radius-sm)] px-3 py-2 text-sm"
              >
                Pagamento confirmado! Seu ingresso está garantido.
              </p>
            ) : ticket.status === "pending" ? (
              <p
                role="status"
                className="flash-warning mb-4 rounded-[var(--radius-sm)] px-3 py-2 text-sm"
              >
                Estamos confirmando o pagamento. Atualize em instantes.
              </p>
            ) : (
              <p
                role="alert"
                className="flash-error mb-4 rounded-[var(--radius-sm)] px-3 py-2 text-sm"
              >
                Status: {statusLabel[ticket.status] ?? ticket.status}
              </p>
            )}

            <h2 className="font-display text-2xl font-semibold tracking-tight text-[var(--ink)]">
              {ticket.event.title}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {ticket.event.venue} · {ticket.event.city}
            </p>
            <p className="mt-1 text-sm font-medium text-[var(--ink-soft)]">
              {formatDate(ticket.event.startsAt)}
            </p>
            <p className="mt-4 text-sm text-[var(--ink-soft)]">
              Status do ingresso:{" "}
              <span className="badge badge-soft ml-1 align-middle">
                {statusLabel[ticket.status] ?? ticket.status}
              </span>
            </p>
          </div>
        )}

        {ticket?.status === "paid" ? (
          <div className="surface-card mt-4 border-[color-mix(in_srgb,var(--carmine)_12%,var(--line))] bg-[color-mix(in_srgb,var(--carmine)_5%,var(--paper-card))] p-6 sm:p-7">
            <p className="font-display text-xl font-semibold tracking-tight text-[var(--ink)]">
              Próximos passos
            </p>
            <ol className="mt-4 list-decimal space-y-2.5 pl-5 text-sm leading-relaxed text-[var(--ink-soft)]">
              <li>
                Mostre este ingresso (ou a tela em{" "}
                <Link
                  href="/meus-ingressos"
                  className="font-semibold text-[var(--carmine)] underline-offset-2 hover:underline"
                >
                  Meus ingressos
                </Link>
                ) no check-in.
              </li>
              <li>
                Chegue com alguns minutos de antecedência para o credenciamento.
              </li>
              <li>
                Evento 18+ — leve um documento com foto se for pedido na entrada.
              </li>
            </ol>
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/meus-ingressos" className="btn btn-primary flex-1">
            Meus ingressos
          </Link>
          <Link href="/eventos" className="btn btn-secondary flex-1">
            Ver eventos
          </Link>
        </div>
      </div>
    </main>
  );
}
