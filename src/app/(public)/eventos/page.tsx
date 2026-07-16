import Link from "next/link";
import type { Metadata } from "next";
import { EventCard } from "@/components/events/event-card";
import { listPublishedEvents } from "@/lib/actions/events";
import { JsonLd } from "@/components/seo/json-ld";
import { absoluteUrl, SITE } from "@/lib/seo";

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

export default async function EventosPage() {
  const events = await listPublishedEvents();

  const itemList =
    events.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Próximas noites Coffee Match",
          itemListOrder: "https://schema.org/ItemListOrderAscending",
          numberOfItems: events.length,
          itemListElement: events.map((event, index) => ({
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
        <ul className="flex flex-col gap-5">
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
