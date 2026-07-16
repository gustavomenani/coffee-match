import Link from "next/link";
import { listAdminEvents } from "@/lib/actions/admin";

export const dynamic = "force-dynamic";

function formatBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

const statusLabel: Record<string, string> = {
  draft: "Rascunho",
  published: "Publicado",
  sold_out: "Esgotado",
  live: "Ao vivo",
  closed: "Encerrado",
};

export default async function AdminEventosPage() {
  const events = await listAdminEvents();

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin"
            className="mb-2 inline-block text-sm font-medium text-zinc-600 hover:text-zinc-900"
          >
            ← Admin
          </Link>
          <h1 className="text-2xl font-semibold text-zinc-900">Eventos</h1>
        </div>
        <Link
          href="/admin/eventos/novo"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Novo evento
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-12 text-center">
          <p className="text-base font-medium text-zinc-900">
            Nenhum evento cadastrado
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-zinc-600">
            Crie o primeiro evento para publicar noites de speed dating e
            vender ingressos.
          </p>
          <Link
            href="/admin/eventos/novo"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Criar evento
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Título</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Cidade</th>
                <th className="px-4 py-3 font-medium">Preço</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Ingressos</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr
                  key={event.id}
                  className="border-b border-zinc-100 last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {event.title}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {formatDate(event.startsAt)}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{event.city}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    {formatBRL(event.priceCents)}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {statusLabel[event.status] ?? event.status}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {event._count.tickets}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/eventos/${event.id}`}
                      className="font-medium text-zinc-900 underline"
                    >
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
