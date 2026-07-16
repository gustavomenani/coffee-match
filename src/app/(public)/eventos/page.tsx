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
        <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-600">
          Nenhum evento publicado no momento. Volte em breve!
        </p>
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
