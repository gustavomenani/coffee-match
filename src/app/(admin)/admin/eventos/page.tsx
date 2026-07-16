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
        <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-600">
          Nenhum evento cadastrado.{" "}
          <Link href="/admin/eventos/novo" className="font-medium underline">
            Criar o primeiro
          </Link>
        </p>
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
