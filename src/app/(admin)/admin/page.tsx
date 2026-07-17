import Link from "next/link";
import { requireAdminOrThrow } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

export default async function AdminDashboardPage() {
  const { membership } = await requireAdminOrThrow();
  const orgId = membership.organizationId;
  const now = new Date();

  const [eventsCount, publishedCount, paidTicketsCount, upcomingCount, nextEvent] =
    await Promise.all([
      prisma.event.count({
        where: { organizationId: orgId },
      }),
      prisma.event.count({
        where: { organizationId: orgId, status: "published" },
      }),
      prisma.ticket.count({
        where: {
          status: "paid",
          event: { organizationId: orgId },
        },
      }),
      prisma.event.count({
        where: {
          organizationId: orgId,
          startsAt: { gte: now },
          status: { in: ["published", "sold_out", "live"] },
        },
      }),
      prisma.event.findFirst({
        where: {
          organizationId: orgId,
          startsAt: { gte: now },
          status: { in: ["published", "sold_out", "live", "draft"] },
        },
        orderBy: { startsAt: "asc" },
        select: {
          id: true,
          title: true,
          startsAt: true,
          venue: true,
          city: true,
          status: true,
          slug: true,
        },
      }),
    ]);

  const stats = [
    {
      label: "Eventos",
      value: eventsCount,
      hint: "Total cadastrados",
    },
    {
      label: "Publicados",
      value: publishedCount,
      hint: "À venda agora",
    },
    {
      label: "Ingressos pagos",
      value: paidTicketsCount,
      hint: "Confirmados",
    },
    {
      label: "Próximos",
      value: upcomingCount,
      hint: "Com data futura",
    },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="eyebrow mb-3">Operação</p>
      <h1 className="font-display text-4xl font-semibold tracking-tight text-[var(--ink)] sm:text-5xl">
        Painel admin
      </h1>
      <p className="mt-3 max-w-xl text-base text-[var(--muted)]">
        Publique noites, faça check-in e abra a votação — o coração da operação.
      </p>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <li key={stat.label} className="surface-card p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--champagne)]">
              {stat.label}
            </p>
            <p className="font-display mt-2 text-4xl font-semibold tracking-tight text-[var(--ink)]">
              {stat.value}
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">{stat.hint}</p>
          </li>
        ))}
      </ul>

      {nextEvent ? (
        <div className="surface-card mt-6 p-6 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--champagne)]">
            Próximo evento
          </p>
          <h2 className="font-display mt-2 text-2xl font-semibold tracking-tight text-[var(--ink)]">
            {nextEvent.title}
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {nextEvent.venue} · {nextEvent.city}
          </p>
          <p className="mt-1 text-sm font-medium text-[var(--ink-soft)]">
            {formatDate(nextEvent.startsAt)}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/admin/eventos/${nextEvent.id}`}
              className="btn btn-primary !min-h-10 !px-4 !text-sm"
            >
              Gerenciar
            </Link>
            <Link
              href={`/admin/eventos/${nextEvent.id}/noite`}
              className="btn btn-secondary !min-h-10 !px-4 !text-sm"
            >
              Noite
            </Link>
          </div>
        </div>
      ) : null}

      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        <li>
          <Link href="/admin/eventos" className="surface-card surface-card-hover block p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--champagne)]">
              Agenda
            </p>
            <span className="font-display mt-2 block text-2xl font-semibold text-[var(--ink)]">
              Eventos
            </span>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Listar, editar e acompanhar vagas.
            </p>
          </Link>
        </li>
        <li>
          <Link
            href="/admin/eventos/novo"
            className="surface-card surface-card-hover block p-7"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--champagne)]">
              Criar
            </p>
            <span className="font-display mt-2 block text-2xl font-semibold text-[var(--ink)]">
              Nova noite
            </span>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Data, local, capacidades e preço.
            </p>
          </Link>
        </li>
      </ul>
    </main>
  );
}
