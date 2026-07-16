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
    <main className="mx-auto w-full max-w-lg px-4 py-12">
      <Link
        href="/admin/eventos"
        className="mb-4 inline-block text-sm font-medium text-zinc-600 hover:text-zinc-900"
      >
        ← Eventos
      </Link>
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900">Novo evento</h1>
      <p className="mb-6 text-sm text-zinc-600">
        Preencha os dados da noite. A sessão de votação é criada automaticamente.
      </p>

      {params.error ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {params.error}
        </p>
      ) : null}

      <EventForm action={createEventAction} submitLabel="Criar evento" />
    </main>
  );
}
