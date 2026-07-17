import Link from "next/link";
import type { Metadata } from "next";
import { EventCard } from "@/components/events/event-card";
import { CityFilter, slugifyCity } from "@/components/events/city-filter";
import { listPublishedEvents, listPastEvents } from "@/lib/actions/events";
import { JsonLd } from "@/components/seo/json-ld";
import { Reveal } from "@/components/ui/reveal";
import { absoluteUrl, SITE } from "@/lib/seo";
import { formatDate } from "@/lib/datetime";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Próximas noites de speed dating",
  description:
    "Agenda Coffee Match: próximas noites de speed dating presencial no Brasil. Garanta sua vaga, 18+, matches mútuos com WhatsApp.",
  alternates: { canonical: absoluteUrl("/eventos") },
  openGraph: {
    title: `Próximas noites | ${SITE.name}`,
    description:
      "Escolha uma noite de speed dating presencial. Coffee Match — conectando pessoas, uma xícara por vez.",
    url: absoluteUrl("/eventos"),
    images: [{ url: absoluteUrl("/logo.jpeg"), alt: SITE.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: `Próximas noites | ${SITE.name}`,
    description: "Agenda de speed dating presencial Coffee Match.",
  },
};

export default async function EventosPage({
  searchParams,
}: {
  searchParams: Promise<{ cidade?: string | string[] }>;
}) {
  const [events, pastEvents, { cidade }] = await Promise.all([
    listPublishedEvents(),
    listPastEvents(),
    searchParams,
  ]);

  // Cidades únicas dos eventos retornados, ordenadas pt-BR.
  const cities = [...new Set(events.map((event) => event.city))].sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );

  // Param desconhecido (ou ausente) → "Todas".
  const cidadeParam = Array.isArray(cidade) ? cidade[0] : cidade;
  const activeCity =
    cidadeParam != null
      ? (cities.find((city) => slugifyCity(city) === cidadeParam) ?? null)
      : null;
  const activeSlug = activeCity ? slugifyCity(activeCity) : null;

  const filteredEvents = activeCity
    ? events.filter((event) => event.city === activeCity)
    : events;

  const itemList =
    filteredEvents.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Próximas noites Coffee Match",
          itemListOrder: "https://schema.org/ItemListOrderAscending",
          numberOfItems: filteredEvents.length,
          itemListElement: filteredEvents.map((event, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: absoluteUrl(`/eventos/${event.slug}`),
            name: event.title,
          })),
        }
      : null;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      {itemList ? <JsonLd data={itemList} /> : null}
      <div className="mb-12 max-w-2xl">
        <p className="eyebrow mb-3">Agenda</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-[var(--ink)] sm:text-5xl">
          Próximas noites de speed dating
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[var(--muted)]">
          Escolha a data, garanta sua vaga no Coffee Match e prepare o melhor
          assunto da semana. Eventos presenciais 18+ com matches mútuos.
        </p>
      </div>

      {cities.length >= 2 ? (
        <CityFilter cities={cities} activeSlug={activeSlug} />
      ) : null}

      {filteredEvents.length === 0 ? (
        <div className="surface-card px-6 py-16 text-center sm:px-10">
          <p className="font-display text-2xl font-semibold text-[var(--ink)]">
            Em breve novos encontros
          </p>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[var(--muted)]">
            Estamos preparando as próximas noites. Crie sua conta para estar
            pronta(o) quando as vagas abrirem.
          </p>
          {activeCity ? (
            <Link href="/eventos" className="btn btn-primary mt-8">
              Ver todas as cidades
            </Link>
          ) : (
            <Link href="/cadastro" className="btn btn-primary mt-8">
              Criar conta
            </Link>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-5">
          {filteredEvents.map((event, i) => (
            <Reveal as="li" key={event.id} delay={i * 70}>
              <EventCard event={event} />
            </Reveal>
          ))}
        </ul>
      )}

      {pastEvents.length > 0 ? (
        <section aria-labelledby="noites-anteriores" className="mt-16">
          <p className="eyebrow mb-3">Histórico</p>
          <h2
            id="noites-anteriores"
            className="font-display text-3xl font-semibold tracking-tight text-[var(--ink)]"
          >
            Noites anteriores
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
            Já aconteceram — e as próximas vêm aí.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pastEvents.map((event, i) => (
              <Reveal as="li" key={event.id} delay={i * 60}>
                <Link
                  href={`/eventos/${event.slug}`}
                  className="surface-card surface-card-hover block p-5"
                >
                  <h3 className="font-display text-lg font-semibold tracking-tight text-[var(--ink)]">
                    {event.title}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {event.city} · {event.venue}
                  </p>
                  <p className="mt-2 text-sm font-medium text-[var(--ink-soft)]">
                    {formatDate(event.startsAt)}
                  </p>
                </Link>
              </Reveal>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
