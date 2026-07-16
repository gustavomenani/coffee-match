import Link from "next/link";
import { EventForm } from "@/components/events/event-form";
import { createEventAction, requireAdmin } from "@/lib/actions/admin";

export const dynamic = "force-dynamic";

export default async function NovoEventoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="max-w-lg">
        <Link
          href="/admin/eventos"
          className="mb-3 inline-block text-sm font-semibold text-[var(--muted)] hover:text-[var(--carmine)]"
        >
          ← Eventos
        </Link>
        <p className="eyebrow mb-3">Criar</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-[var(--ink)] sm:text-5xl">
          Novo evento
        </h1>
        <p className="mt-3 text-base text-[var(--muted)]">
          Preencha os dados da noite. A sessão de votação é criada
          automaticamente.
        </p>

        {params.error ? (
          <p className="mt-5 rounded-[var(--radius-sm)] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {params.error}
          </p>
        ) : null}

        <div className="surface-card mt-8 p-5 sm:p-6">
          <EventForm action={createEventAction} submitLabel="Criar evento" />
        </div>
      </div>
    </main>
  );
}
