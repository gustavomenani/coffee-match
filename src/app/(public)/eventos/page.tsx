import Link from "next/link";
import { EventCard } from "@/components/events/event-card";
import { listPublishedEvents } from "@/lib/actions/events";

export const dynamic = "force-dynamic";

export default async function EventosPage() {
  const events = await listPublishedEvents();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-10 max-w-2xl">
        <p className="eyebrow mb-3">Agenda</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-[var(--ink)] sm:text-5xl">
          Próximas noites
        </h1>
        <p className="mt-3 text-base leading-relaxed text-[var(--muted)]">
          Escolha a data, garanta sua vaga e prepare o melhor assunto da semana.
        </p>
      </div>

      {events.length === 0 ? (
        <div className="surface-card px-6 py-16 text-center sm:px-10">
          <p className="font-display text-2xl font-semibold text-[var(--ink)]">
            Em breve novos encontros
          </p>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[var(--muted)]">
            Estamos preparando as próximas noites. Crie sua conta para estar
            pronta(o) quando as vagas abrirem.
          </p>
          <Link href="/cadastro" className="btn btn-primary mt-8">
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
