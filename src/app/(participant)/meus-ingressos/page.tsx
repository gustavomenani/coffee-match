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

const statusClass: Record<string, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  paid: "border-green-200 bg-green-50 text-green-800",
  cancelled: "border-zinc-200 bg-zinc-50 text-zinc-600",
  refunded: "border-red-200 bg-red-50 text-red-700",
};

export default async function MeusIngressosPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const tickets = await prisma.ticket.findMany({
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
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900">
        Meus ingressos
      </h1>
      <p className="mb-8 text-sm text-zinc-600">
        Seus ingressos comprados e o status de cada um.
      </p>

      {tickets.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-10 text-center">
          <p className="mb-4 text-sm text-zinc-600">
            Você ainda não tem ingressos.
          </p>
          <Link
            href="/eventos"
            className="inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Ver eventos
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {tickets.map((ticket) => (
            <li
              key={ticket.id}
              className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                <h2 className="text-base font-medium text-zinc-900">
                  {ticket.event.title}
                </h2>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                    statusClass[ticket.status] ?? statusClass.pending
                  }`}
                >
                  {statusLabel[ticket.status] ?? ticket.status}
                </span>
              </div>
              <p className="text-sm text-zinc-600">
                {ticket.event.venue} · {ticket.event.city}
              </p>
              <p className="mt-1 text-sm text-zinc-600">
                {new Date(ticket.event.startsAt).toLocaleString("pt-BR")}
              </p>
              {ticket.checkedInAt ? (
                <p className="mt-2 text-xs font-medium text-green-700">
                  Check-in realizado em{" "}
                  {new Date(ticket.checkedInAt).toLocaleString("pt-BR")}
                </p>
              ) : ticket.status === "paid" ? (
                <p className="mt-2 text-xs text-zinc-500">
                  Aguardando check-in no evento
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                <Link
                  href={`/eventos/${ticket.event.slug}`}
                  className="font-medium text-zinc-900 underline-offset-2 hover:underline"
                >
                  Ver evento
                </Link>
                {ticket.status === "pending" ? (
                  <Link
                    href={`/pagamento/pendente?ticket=${ticket.id}`}
                    className="font-medium text-amber-800 underline-offset-2 hover:underline"
                  >
                    Ver pagamento
                  </Link>
                ) : null}
                {ticket.status === "paid" ? (
                  <Link
                    href={`/pagamento/sucesso?ticket=${ticket.id}`}
                    className="font-medium text-green-800 underline-offset-2 hover:underline"
                  >
                    Comprovante
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
