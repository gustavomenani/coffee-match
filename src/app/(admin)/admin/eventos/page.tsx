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
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/admin"
            className="mb-3 inline-block text-sm font-semibold text-[var(--muted)] hover:text-[var(--carmine)]"
          >
            ← Admin
          </Link>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-[var(--ink)]">
            Eventos
          </h1>
        </div>
        <Link href="/admin/eventos/novo" className="btn btn-primary">
          Novo evento
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="surface-card px-6 py-16 text-center">
          <p className="font-display text-2xl font-semibold text-[var(--ink)]">
            Nenhum evento cadastrado
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--muted)]">
            Crie o primeiro evento para publicar noites e vender ingressos.
          </p>
          <Link href="/admin/eventos/novo" className="btn btn-primary mt-8">
            Criar evento
          </Link>
        </div>
      ) : (
        <div className="surface-card overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--line)] bg-[var(--paper-deep)] text-xs uppercase tracking-wider text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Título</th>
                <th className="px-4 py-3 font-semibold">Data</th>
                <th className="px-4 py-3 font-semibold">Cidade</th>
                <th className="px-4 py-3 font-semibold">Preço</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Ingressos</th>
                <th className="px-4 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr
                  key={event.id}
                  className="border-b border-[var(--line)] last:border-0"
                >
                  <td className="px-4 py-4 font-medium text-[var(--ink)]">
                    {event.title}
                  </td>
                  <td className="px-4 py-4 text-[var(--muted)]">
                    {formatDate(event.startsAt)}
                  </td>
                  <td className="px-4 py-4 text-[var(--muted)]">{event.city}</td>
                  <td className="px-4 py-4 tabular text-[var(--ink-soft)]">
                    {formatBRL(event.priceCents)}
                  </td>
                  <td className="px-4 py-4">
                    <span className="badge badge-soft">
                      {statusLabel[event.status] ?? event.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 tabular text-[var(--muted)]">
                    {event._count?.tickets ?? "—"}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Link
                      href={`/admin/eventos/${event.id}`}
                      className="font-semibold text-[var(--carmine)] hover:underline"
                    >
                      Abrir
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
