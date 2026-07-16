import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toDataUrl } from "@/lib/qr";

const statusLabel: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

const statusClass: Record<string, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  paid: "border-green-200 bg-green-50 text-green-800",
  cancelled: "border-zinc-200 bg-zinc-50 text-zinc-600",
  refunded: "border-red-200 bg-red-50 text-red-700",
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
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <div className="mb-6">
        <Link
          href="/meus-ingressos"
          className="text-sm font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline"
        >
          ← Voltar para meus ingressos
        </Link>
      </div>

      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <h1 className="text-2xl font-semibold text-zinc-900">
          {ticket.event.title}
        </h1>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
            statusClass[ticket.status] ?? statusClass.pending
          }`}
        >
          {statusLabel[ticket.status] ?? ticket.status}
        </span>
      </div>

      <div className="mb-8 space-y-1 text-sm text-zinc-600">
        <p>
          <span className="font-medium text-zinc-800">Data:</span>{" "}
          {new Date(ticket.event.startsAt).toLocaleString("pt-BR")}
        </p>
        <p>
          <span className="font-medium text-zinc-800">Local:</span>{" "}
          {ticket.event.venue}
        </p>
        <p>
          <span className="font-medium text-zinc-800">Endereço:</span>{" "}
          {ticket.event.address}
          {ticket.event.city ? ` · ${ticket.event.city}` : ""}
        </p>
        {ticket.checkedInAt ? (
          <p className="pt-1 text-sm font-medium text-green-700">
            Check-in realizado em{" "}
            {new Date(ticket.checkedInAt).toLocaleString("pt-BR")}
          </p>
        ) : ticket.status === "paid" ? (
          <p className="pt-1 text-sm text-zinc-500">
            Aguardando check-in no evento
          </p>
        ) : null}
      </div>

      <p className="mb-8 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
        Apresente o QR de entrada na porta do evento. O QR de votação facilita o
        acesso à urna digital após o check-in.
      </p>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-zinc-900">
          QR de entrada
        </h2>
        <p className="mb-4 text-sm text-zinc-600">
          Mostre este código na entrada para o check-in.
        </p>
        <div className="flex flex-col items-center rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={doorQr}
            alt="QR code de entrada do ingresso"
            width={280}
            height={280}
            className="h-auto w-full max-w-[280px]"
          />
          <p className="mt-3 break-all text-center font-mono text-xs text-zinc-500">
            {ticket.id}
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-zinc-900">
          QR de votação
        </h2>
        <p className="mb-4 text-sm text-zinc-600">
          Escaneie para abrir a página de votação do evento.
        </p>
        <div className="flex flex-col items-center rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={votingQr}
            alt="QR code de votação do evento"
            width={280}
            height={280}
            className="h-auto w-full max-w-[280px]"
          />
          <p className="mt-3 break-all text-center text-xs text-zinc-500">
            {votingUrl}
          </p>
        </div>
      </section>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link
          href="/meus-ingressos"
          className="rounded-md border border-zinc-300 bg-white px-4 py-2 font-medium text-zinc-800 hover:bg-zinc-50"
        >
          Voltar
        </Link>
        <Link
          href={`/evento/${ticket.event.id}/votar`}
          className="rounded-md bg-rose-600 px-4 py-2 font-medium text-white hover:bg-rose-700"
        >
          Votar
        </Link>
        {canSeeMatches ? (
          <Link
            href={`/evento/${ticket.event.id}/matches`}
            className="rounded-md bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-800"
          >
            Ver matches
          </Link>
        ) : null}
        <Link
          href={`/eventos/${ticket.event.slug}`}
          className="rounded-md border border-zinc-300 bg-white px-4 py-2 font-medium text-zinc-800 hover:bg-zinc-50"
        >
          Ver evento
        </Link>
      </div>

      {canVote ? (
        <p className="mt-4 text-xs text-green-700">
          A votação está aberta — use o link ou o QR acima.
        </p>
      ) : null}
    </main>
  );
}
