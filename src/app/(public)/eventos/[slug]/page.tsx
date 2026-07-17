import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BuyTicketButton } from "@/components/events/event-card";
import { NotifyMeForm } from "@/components/events/notify-me-form";
import { ShareButton } from "@/components/events/share-button";
import { getEventBySlug } from "@/lib/actions/events";
import { inEarlyAccessWindow } from "@/lib/domain/subscription";
import { JsonLd } from "@/components/seo/json-ld";
import { absoluteUrl, SITE, orgId } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) {
    return {
      title: "Evento não encontrado",
      robots: { index: false, follow: false },
    };
  }

  const title = `${event.title} — speed dating em ${event.city}`;
  const description = `Speed dating presencial no Coffee Match: ${event.title} em ${event.venue}, ${event.city}. ${formatBRL(event.priceCents)}. Matches mútuos com WhatsApp. 18+.`;
  const url = absoluteUrl(`/eventos/${event.slug}`);

  return {
    title,
    description,
    keywords: [
      event.title,
      event.city,
      "speed dating",
      "Coffee Match",
      "encontros presenciais",
      event.venue,
    ],
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      url,
      siteName: SITE.name,
      title,
      description,
      images: [
        {
          url: absoluteUrl("/logo.jpeg"),
          width: 1200,
          height: 1200,
          alt: `${event.title} | Coffee Match`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [absoluteUrl("/logo.jpeg")],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

function formatBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(value);
}

const statusLabel: Record<string, string> = {
  published: "Aberto para compra",
  sold_out: "Esgotado",
  live: "Em andamento",
  closed: "Encerrado",
};

export default async function EventoDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const canBuy =
    event.status === "published" &&
    (event.remainingMen > 0 || event.remainingWomen > 0);
  const earlyAccess = inEarlyAccessWindow(event.earlyAccessUntil);

  const url = absoluteUrl(`/eventos/${event.slug}`);
  const eventStatus =
    event.status === "sold_out"
      ? "https://schema.org/EventScheduled"
      : event.status === "closed"
        ? "https://schema.org/EventCancelled"
        : "https://schema.org/EventScheduled";

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Início",
          item: absoluteUrl("/"),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Eventos",
          item: absoluteUrl("/eventos"),
        },
        {
          "@type": "ListItem",
          position: 3,
          name: event.title,
          item: url,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "Event",
      name: event.title,
      description: `Noite de speed dating Coffee Match em ${event.city}. Rodadas presenciais, votação no celular e matches mútuos. Evento 18+.`,
      startDate: event.startsAt.toISOString(),
      endDate: event.endsAt.toISOString(),
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      eventStatus,
      image: [absoluteUrl("/logo.jpeg")],
      url,
      location: {
        "@type": "Place",
        name: event.venue,
        address: {
          "@type": "PostalAddress",
          streetAddress: event.address,
          addressLocality: event.city,
          addressCountry: "BR",
        },
      },
      organizer: {
        "@type": "Organization",
        "@id": orgId(),
        name: SITE.name,
        url: absoluteUrl("/"),
      },
      performer: {
        "@type": "Organization",
        name: SITE.name,
      },
      offers: {
        "@type": "Offer",
        url,
        price: (event.priceCents / 100).toFixed(2),
        priceCurrency: "BRL",
        availability: canBuy
          ? "https://schema.org/InStock"
          : "https://schema.org/SoldOut",
        validFrom: new Date().toISOString(),
      },
      isAccessibleForFree: false,
      inLanguage: "pt-BR",
    },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <JsonLd data={jsonLd} />

      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-[var(--muted)]">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="font-medium hover:text-[var(--coffee)]">
              Início
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link
              href="/eventos"
              className="font-medium hover:text-[var(--coffee)]"
            >
              Eventos
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="font-semibold text-[var(--ink-soft)]">{event.title}</li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="badge badge-live">
              {statusLabel[event.status] ?? event.status}
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
              {event.city}
            </span>
          </div>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-[var(--ink)] sm:text-5xl">
            {event.title}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--muted)]">
            Noite de <strong className="text-[var(--ink-soft)]">speed dating</strong>{" "}
            organizada pelo Coffee Match em {event.city}. Conversas presenciais,
            votação no celular e contato liberado só em match mútuo. Evento{" "}
            <strong className="text-[var(--ink-soft)]">18+</strong>.
          </p>

          <dl className="mt-10 space-y-6">
            <div className="surface-card p-5">
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--champagne)]">
                Quando
              </dt>
              <dd className="mt-2 text-base text-[var(--ink-soft)]">
                <time dateTime={event.startsAt.toISOString()}>
                  {formatDate(event.startsAt)}
                </time>
                <span className="mt-1 block text-sm text-[var(--muted)]">
                  até{" "}
                  <time dateTime={event.endsAt.toISOString()}>
                    {formatDate(event.endsAt)}
                  </time>
                </span>
              </dd>
            </div>
            <div className="surface-card p-5">
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--champagne)]">
                Local
              </dt>
              <dd className="mt-2 text-base text-[var(--ink-soft)]">
                <span className="font-semibold text-[var(--ink)]">
                  {event.venue}
                </span>
                <br />
                {event.address}, {event.city}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${event.venue}, ${event.address}, ${event.city}`
                  )}`}
                  target="_blank"
                  rel="noopener"
                  className="link-coffee mt-2 block text-sm font-semibold"
                >
                  Como chegar →
                </a>
              </dd>
            </div>
            <div className="surface-card p-5">
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--champagne)]">
                Vagas restantes
              </dt>
              <dd className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-[var(--radius-sm)] bg-[var(--paper-deep)] px-4 py-3">
                  <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
                    Homens
                  </p>
                  <p className="font-display text-2xl font-semibold tabular text-[var(--ink)]">
                    {Math.max(0, event.remainingMen)}
                    <span className="text-base text-[var(--muted)]">
                      /{event.capacityMen}
                    </span>
                  </p>
                </div>
                <div className="rounded-[var(--radius-sm)] bg-[var(--paper-deep)] px-4 py-3">
                  <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
                    Mulheres
                  </p>
                  <p className="font-display text-2xl font-semibold tabular text-[var(--ink)]">
                    {Math.max(0, event.remainingWomen)}
                    <span className="text-base text-[var(--muted)]">
                      /{event.capacityWomen}
                    </span>
                  </p>
                </div>
              </dd>
            </div>
          </dl>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="surface-card overflow-hidden">
            <div className="border-b border-[var(--line)] bg-[linear-gradient(165deg,#1a100c,#2a1a12)] px-6 py-7 text-[#f5e6d3]">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[var(--champagne-light)]">
                Ingresso
              </p>
              <p className="font-display mt-2 text-4xl font-semibold tabular">
                {formatBRL(event.priceCents)}
              </p>
              <p className="mt-2 text-sm text-[color-mix(in_srgb,#f5e6d3_65%,transparent)]">
                Pagamento com Pix ou cartão
              </p>
            </div>
            <div className="space-y-5 p-6">
              {earlyAccess ? (
                <p className="flash-warning rounded-[var(--radius-sm)] px-4 py-3 text-sm">
                  <strong>Venda antecipada</strong> exclusiva para assinantes
                  até {formatDate(event.earlyAccessUntil!)}.{" "}
                  <Link
                    href="/assinatura"
                    className="font-semibold text-[var(--coffee)] underline-offset-2 hover:underline"
                  >
                    Assine por R$ 10/mês
                  </Link>
                  .
                </p>
              ) : null}
              {canBuy ? (
                <BuyTicketButton eventId={event.id} />
              ) : (
                <div className="space-y-4">
                  <p className="rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--paper-deep)] px-4 py-3 text-sm text-[var(--muted)]">
                    {event.status === "sold_out" ||
                    (event.remainingMen <= 0 && event.remainingWomen <= 0)
                      ? "Ingressos esgotados para este evento."
                      : "Compra indisponível no momento."}
                  </p>
                  <NotifyMeForm eventId={event.id} />
                </div>
              )}
              <ShareButton
                title={event.title}
                text={`Vem comigo no ${event.title}, speed dating do Coffee Match em ${event.city}!`}
                url={url}
              />
              <div className="space-y-2 text-sm leading-relaxed text-[var(--muted)]">
                <p>
                  Evento <strong className="text-[var(--ink-soft)]">18+</strong>.
                  Ao comprar, você concorda com as{" "}
                  <Link
                    href="/regras"
                    className="font-semibold text-[var(--coffee)] underline-offset-2 hover:underline"
                  >
                    regras
                  </Link>
                  .
                </p>
                <p>
                  Condições de{" "}
                  <Link
                    href="/reembolso"
                    className="font-semibold text-[var(--coffee)] underline-offset-2 hover:underline"
                  >
                    reembolso
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
