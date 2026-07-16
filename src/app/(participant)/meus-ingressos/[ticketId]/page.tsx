import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toDataUrl } from "@/lib/qr";
import { CopyButton } from "@/components/ui/copy-button";
import { PrintButton } from "@/components/ui/print-button";

const statusLabel: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

type PageProps = {
  params: Promise<{ ticketId: string }>;
};

export default async function TicketDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { ticketId } = await params;

  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, userId: session.user.id },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          slug: true,
          venue: true,
          address: true,
          city: true,
          startsAt: true,
          endsAt: true,
          status: true,
          session: { select: { status: true } },
        },
      },
    },
  });

  if (!ticket) {
    notFound();
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";
  const votingUrl = `${appUrl}/evento/${ticket.event.id}/votar`;

  const [doorQr, votingQr] = await Promise.all([
    toDataUrl(ticket.id),
    toDataUrl(votingUrl),
  ]);

  const sessionStatus = ticket.event.session?.status;
  const canVote =
    ticket.status === "paid" &&
    Boolean(ticket.checkedInAt) &&
    sessionStatus === "voting_open";
  const canSeeMatches =
    ticket.status === "paid" &&
    Boolean(ticket.checkedInAt) &&
    sessionStatus === "voting_closed";

  return (
    <main className="print-ticket page-glow mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="no-print mb-8">
        <Link
          href="/meus-ingressos"
          className="text-sm font-semibold text-[var(--muted)] underline-offset-2 transition-colors hover:text-[var(--carmine)] hover:underline"
        >
          ← Voltar para meus ingressos
        </Link>
      </div>

      {/* Premium ticket card */}
      <article className="surface-card overflow-hidden">
        <div className="border-b border-[var(--line)] bg-[linear-gradient(165deg,color-mix(in_srgb,var(--carmine)_8%,var(--paper-card)),var(--paper-card))] px-6 py-7 sm:px-8 sm:py-9">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow mb-3">Ingresso</p>
              <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
                {ticket.event.title}
              </h1>
            </div>
            <span className="badge badge-soft">
              {statusLabel[ticket.status] ?? ticket.status}
            </span>
          </div>

          <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Data
              </p>
              <p className="mt-1 font-medium text-[var(--ink-soft)]">
                {new Date(ticket.event.startsAt).toLocaleString("pt-BR")}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Local
              </p>
              <p className="mt-1 font-medium text-[var(--ink-soft)]">
                {ticket.event.venue}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Endereço
              </p>
              <p className="mt-1 font-medium text-[var(--ink-soft)]">
                {ticket.event.address}
                {ticket.event.city ? ` · ${ticket.event.city}` : ""}
              </p>
            </div>
          </div>

          {ticket.checkedInAt ? (
            <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-[var(--success)]">
              Check-in · {new Date(ticket.checkedInAt).toLocaleString("pt-BR")}
            </p>
          ) : ticket.status === "paid" ? (
            <p className="mt-5 text-xs font-medium text-[var(--muted)]">
              Aguardando check-in no evento
            </p>
          ) : null}
        </div>

        <div className="px-6 py-5 sm:px-8">
          <p className="rounded-[var(--radius-sm)] bg-[var(--paper-deep)] px-4 py-3 text-sm leading-relaxed text-[var(--ink-soft)]">
            Apresente o QR de entrada na porta do evento. O QR de votação
            facilita o acesso à urna digital após o check-in.
          </p>
        </div>

        <div className="grid gap-6 border-t border-[var(--line)] px-6 py-8 sm:grid-cols-2 sm:px-8">
          <section>
            <h2 className="font-display text-xl font-semibold tracking-tight text-[var(--ink)]">
              QR de entrada
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Mostre este código na entrada para o check-in.
            </p>
            <div className="mt-4 flex flex-col items-center rounded-[var(--radius-md)] border border-[var(--line)] bg-white p-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={doorQr}
                alt="QR code de entrada do ingresso"
                width={280}
                height={280}
                className="h-auto w-full max-w-[240px]"
              />
              <p className="mt-3 break-all text-center font-mono text-[0.65rem] text-[var(--muted)]">
                {ticket.id}
              </p>
              <div className="no-print mt-3">
                <CopyButton value={ticket.id} label="Copiar código" />
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold tracking-tight text-[var(--ink)]">
              QR de votação
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Escaneie para abrir a página de votação do evento.
            </p>
            <div className="mt-4 flex flex-col items-center rounded-[var(--radius-md)] border border-[var(--line)] bg-white p-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={votingQr}
                alt="QR code de votação do evento"
                width={280}
                height={280}
                className="h-auto w-full max-w-[240px]"
              />
              <p className="mt-3 break-all text-center text-[0.65rem] text-[var(--muted)]">
                {votingUrl}
              </p>
              <div className="no-print mt-3">
                <CopyButton value={votingUrl} label="Copiar link" />
              </div>
            </div>
          </section>
        </div>

        <div className="no-print flex flex-wrap gap-2 border-t border-[var(--line)] px-6 py-6 sm:px-8">
          <PrintButton />
          <Link
            href="/meus-ingressos"
            className="btn btn-secondary !min-h-10 !px-4 !text-sm"
          >
            Voltar
          </Link>
          <Link
            href={`/evento/${ticket.event.id}/votar`}
            className="btn btn-primary !min-h-10 !px-4 !text-sm"
          >
            Votar
          </Link>
          {canSeeMatches ? (
            <Link
              href={`/evento/${ticket.event.id}/matches`}
              className="btn btn-secondary !min-h-10 !px-4 !text-sm"
            >
              Ver matches
            </Link>
          ) : null}
          <Link
            href={`/eventos/${ticket.event.slug}`}
            className="btn btn-secondary !min-h-10 !px-4 !text-sm"
          >
            Ver evento
          </Link>
        </div>

        {canVote ? (
          <p className="border-t border-[var(--line)] px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[var(--success)] sm:px-8">
            Votação aberta — use o link ou o QR acima
          </p>
        ) : null}
      </article>
    </main>
  );
}
