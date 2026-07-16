import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-12">
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900">
        Pagamento
      </h1>

      {!ticket ? (
        <p className="mb-6 text-sm text-zinc-600">
          Ingresso não encontrado. Verifique em Meus ingressos.
        </p>
      ) : (
        <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          {ticket.status === "paid" ? (
            <p className="mb-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              Pagamento confirmado! Seu ingresso está garantido.
            </p>
          ) : ticket.status === "pending" ? (
            <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Estamos confirmando o pagamento. Atualize em instantes.
            </p>
          ) : (
            <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Status: {statusLabel[ticket.status] ?? ticket.status}
            </p>
          )}

          <p className="text-base font-medium text-zinc-900">
            {ticket.event.title}
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            {ticket.event.venue} · {ticket.event.city}
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            {new Date(ticket.event.startsAt).toLocaleString("pt-BR")}
          </p>
          <p className="mt-3 text-sm text-zinc-800">
            Status do ingresso:{" "}
            <span className="font-medium">
              {statusLabel[ticket.status] ?? ticket.status}
            </span>
          </p>
        </div>
      )}

      {ticket?.status === "paid" ? (
        <div className="mb-6 rounded-xl border border-rose-100 bg-rose-50/60 px-4 py-4">
          <p className="text-sm font-semibold text-zinc-900">Próximos passos</p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-zinc-700">
            <li>
              Mostre este ingresso (ou a tela em{" "}
              <Link
                href="/meus-ingressos"
                className="font-medium text-zinc-900 underline-offset-2 hover:underline"
              >
                Meus ingressos
              </Link>
              ) no check-in.
            </li>
            <li>Chegue com alguns minutos de antecedência para o credenciamento.</li>
            <li>Evento 18+ — leve um documento com foto se for pedido na entrada.</li>
          </ol>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 text-sm">
        <Link
          href="/meus-ingressos"
          className="rounded-md bg-zinc-900 px-4 py-2 text-center font-medium text-white hover:bg-zinc-800"
        >
          Meus ingressos
        </Link>
        <Link
          href="/eventos"
          className="rounded-md border border-zinc-300 px-4 py-2 text-center font-medium text-zinc-800 hover:bg-zinc-50"
        >
          Ver eventos
        </Link>
      </div>
    </main>
  );
}
