import Link from "next/link";
import { notFound } from "next/navigation";
import { EventForm } from "@/components/events/event-form";
import {
  requireAdmin,
  updateEventAction,
} from "@/lib/actions/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export default async function AdminEventoEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const query = await searchParams;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      session: true,
      tickets: {
        where: { status: "paid" },
        include: {
          user: {
            select: { name: true, email: true, gender: true, phone: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!event) notFound();

  const boundUpdate = updateEventAction.bind(null, event.id);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <Link
        href="/admin/eventos"
        className="mb-4 inline-block text-sm font-medium text-zinc-600 hover:text-zinc-900"
      >
        ← Eventos
      </Link>
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900">
        Editar evento
      </h1>
      <p className="mb-4 text-sm text-zinc-600">{event.title}</p>

      <div className="mb-6 flex flex-wrap gap-3 text-sm">
        <Link
          href={`/admin/eventos/${event.id}/noite`}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 font-medium text-zinc-900 hover:bg-zinc-50"
        >
          Operação da noite
        </Link>
        <Link
          href={`/admin/eventos/${event.id}/matches`}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 font-medium text-zinc-900 hover:bg-zinc-50"
        >
          Matches
        </Link>
        <Link
          href={`/eventos/${event.slug}`}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 font-medium text-zinc-900 hover:bg-zinc-50"
        >
          Ver página pública
        </Link>
      </div>

      {query.error ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {query.error}
        </p>
      ) : null}
      {query.saved ? (
        <p className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          Evento atualizado.
        </p>
      ) : null}

      <EventForm
        action={boundUpdate}
        submitLabel="Salvar alterações"
        defaults={{
          title: event.title,
          slug: event.slug,
          venue: event.venue,
          address: event.address,
          city: event.city,
          startsAt: event.startsAt.toISOString(),
          endsAt: event.endsAt.toISOString(),
          capacityMen: event.capacityMen,
          capacityWomen: event.capacityWomen,
          priceCents: event.priceCents,
          status: event.status,
        }}
      />

      <section className="mt-12 border-t border-zinc-200 pt-8">
        <h2 className="mb-1 text-lg font-semibold text-zinc-900">
          Ingressos pagos
        </h2>
        <p className="mb-4 text-sm text-zinc-600">
          Lista somente leitura. Check-in e votação ficam na operação da noite.
        </p>
        {event.tickets.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhum ingresso pago ainda.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Nome</th>
                  <th className="px-3 py-2 font-medium">E-mail</th>
                  <th className="px-3 py-2 font-medium">Gênero</th>
                  <th className="px-3 py-2 font-medium">Telefone</th>
                  <th className="px-3 py-2 font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {event.tickets.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-zinc-100 last:border-0"
                  >
                    <td className="px-3 py-2 text-zinc-900">{t.user.name}</td>
                    <td className="px-3 py-2 text-zinc-600">{t.user.email}</td>
                    <td className="px-3 py-2 text-zinc-600">
                      {t.user.gender === "male" ? "H" : "M"}
                    </td>
                    <td className="px-3 py-2 text-zinc-600">{t.user.phone}</td>
                    <td className="px-3 py-2 text-zinc-600">
                      {formatBRL(event.priceCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {event.session ? (
          <p className="mt-3 text-xs text-zinc-500">
            Sessão: {event.session.status}
          </p>
        ) : null}
      </section>
    </main>
  );
}
