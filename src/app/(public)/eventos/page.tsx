import Link from "next/link";
import { EventCard } from "@/components/events/event-card";
import { listPublishedEvents } from "@/lib/actions/events";

export const dynamic = "force-dynamic";

export default async function EventosPage() {
  const events = await listPublishedEvents();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900">Eventos</h1>
      <p className="mb-8 text-sm text-zinc-600">
        Escolha uma noite de speed dating e garanta sua vaga.
      </p>

      {events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-12 text-center">
          <p className="text-base font-medium text-zinc-900">
            Em breve novos encontros
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-zinc-600">
            Estamos preparando as próximas noites de speed dating. Volte em
            breve ou crie sua conta para ficar pronta(o) quando as vagas
            abrirem.
          </p>
          <Link
            href="/cadastro"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
          >
            Criar conta
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {events.map((event) => (
            <li key={event.id}>
              <EventCard event={event} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
