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

export default async function PagamentoPendentePage({
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

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="animate-rise mx-auto max-w-xl">
        <div
          aria-hidden
          className="mb-6 grid h-14 w-14 place-items-center rounded-full bg-[color-mix(in_srgb,var(--champagne)_22%,var(--paper-card))] text-2xl text-[var(--coffee-deep)] ring-1 ring-[color-mix(in_srgb,var(--champagne)_45%,transparent)] shadow-[var(--shadow-soft)]"
        >
          ◷
        </div>
        <p className="eyebrow mb-3">Checkout</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-[var(--ink)] sm:text-5xl">
          Pagamento pendente
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
                className="flash-success mb-4 rounded-[var(--radius-sm)] px-4 py-3 text-sm leading-relaxed"
              >
                Boa notícia: o pagamento já foi confirmado.
              </p>
            ) : (
              <p
                role="status"
                className="flash-warning mb-4 rounded-[var(--radius-sm)] px-4 py-3 text-sm leading-relaxed"
              >
                Seu pagamento ainda está sendo processado. Você receberá a
                confirmação em breve.
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
