import Link from "next/link";
import { notFound } from "next/navigation";
import { RefundButton } from "@/components/admin/refund-button";
import { EventForm } from "@/components/events/event-form";
import { updateEventAction } from "@/lib/actions/admin";
import { requireAdminOrThrow } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { parseCuid } from "@/lib/security/ids";

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
  const { membership } = await requireAdminOrThrow();
  const { id: rawId } = await params;
  const query = await searchParams;
  const id = parseCuid(rawId);
  if (!id) notFound();

  const event = await prisma.event.findFirst({
    where: { id, organizationId: membership.organizationId },
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

  const interested = await prisma.eventInterest.count({
    where: { eventId: id },
  });

  const boundUpdate = updateEventAction.bind(null, event.id);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-8 max-w-2xl">
        <Link
          href="/admin/eventos"
          className="mb-3 inline-block text-sm font-semibold text-[var(--muted)] hover:text-[var(--carmine)]"
        >
          ← Eventos
        </Link>
        <p className="eyebrow mb-3">Admin</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-[var(--ink)] sm:text-5xl">
          Editar evento
        </h1>
        <p className="mt-2 text-base text-[var(--muted)]">{event.title}</p>
        {interested > 0 ? (
          <p className="mt-3">
            <span className="badge badge-soft">
              Lista de espera: {interested}{" "}
              {interested === 1 ? "e-mail" : "e-mails"}
            </span>
          </p>
        ) : null}
      </div>

      <div className="mb-8 flex flex-wrap gap-3">
        <Link
          href={`/admin/eventos/${event.id}/noite`}
          className="btn btn-secondary"
        >
          Operação da noite
        </Link>
        <Link
          href={`/admin/eventos/${event.id}/matches`}
          className="btn btn-secondary"
        >
          Matches
        </Link>
        <Link href={`/eventos/${event.slug}`} className="btn btn-ghost">
          Ver página pública
        </Link>
      </div>

      {query.error ? (
        <p className="flash-error mb-4 max-w-2xl rounded-[var(--radius-sm)] px-3 py-2 text-sm">
          {query.error}
        </p>
      ) : null}
      {query.saved ? (
        <p className="mb-4 max-w-2xl rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--success)_25%,transparent)] bg-[color-mix(in_srgb,var(--success)_8%,white)] px-3 py-2 text-sm text-[var(--success)]">
          Evento atualizado.
        </p>
      ) : null}

      <div className="surface-card max-w-2xl p-5 sm:p-6">
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
            earlyAccessUntil: event.earlyAccessUntil?.toISOString(),
          }}
        />
      </div>

      <section className="mt-12">
        <div className="gold-rule mb-8" />
        <h2 className="font-display text-2xl font-semibold tracking-tight text-[var(--ink)]">
          Ingressos pagos
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Reembolso total disponível por ingresso. Check-in e votação ficam na
          operação da noite.
        </p>
        {event.tickets.length === 0 ? (
          <div className="surface-card mt-4 px-6 py-12 text-center">
            <p className="font-display text-xl font-semibold text-[var(--ink)]">
              Nenhum ingresso pago
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--muted)]">
              Quando houver vendas confirmadas, elas aparecem aqui.
            </p>
          </div>
        ) : (
          <div className="surface-card mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[var(--line)] bg-[var(--paper-deep)] text-xs uppercase tracking-wider text-[var(--muted)]">
                <tr>
                  <th className="px-3 py-2 font-semibold">Nome</th>
                  <th className="px-3 py-2 font-semibold">E-mail</th>
                  <th className="px-3 py-2 font-semibold">Gênero</th>
                  <th className="px-3 py-2 font-semibold">Telefone</th>
                  <th className="px-3 py-2 font-semibold">Valor</th>
                  <th className="px-3 py-2 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {event.tickets.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-[var(--line)] last:border-0"
                  >
                    <td className="px-3 py-3 font-medium text-[var(--ink)]">
                      {t.user.name}
                    </td>
                    <td className="px-3 py-3 text-[var(--muted)]">
                      {t.user.email}
                    </td>
                    <td className="px-3 py-3 text-[var(--muted)]">
                      {t.user.gender === "male" ? "H" : "M"}
                    </td>
                    <td className="px-3 py-3 text-[var(--muted)]">
                      {t.user.phone}
                    </td>
                    <td className="px-3 py-3 tabular text-[var(--ink-soft)]">
                      {formatBRL(event.priceCents)}
                    </td>
                    <td className="px-3 py-3">
                      <RefundButton ticketId={t.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {event.session ? (
          <p className="mt-3 text-xs text-[var(--muted)]">
            Sessão:{" "}
            <span className="badge badge-soft ml-1 align-middle">
              {event.session.status}
            </span>
          </p>
        ) : null}
      </section>
    </main>
  );
}
