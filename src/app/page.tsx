import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { EventCard } from "@/components/events/event-card";
import { listPublishedEvents } from "@/lib/actions/events";
import { JsonLd } from "@/components/seo/json-ld";
import { Reveal } from "@/components/ui/reveal";
import { SITE, absoluteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    absolute: `${SITE.name} — ${SITE.tagline}`,
  },
  description: SITE.description,
  alternates: { canonical: absoluteUrl("/") },
  openGraph: {
    url: absoluteUrl("/"),
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
};

const faqs = [
  {
    q: "Preciso baixar um app?",
    a: "Não. O site Coffee Match funciona no celular. No dia do evento, você usa o QR para votar.",
  },
  {
    q: "E se eu não tiver match?",
    a: "Acontece. Você ainda conheceu gente ao vivo — e pode ver quem te curtiu, sem liberar contato sem reciprocidade.",
  },
  {
    q: "Posso cancelar o ingresso?",
    a: "Pedidos pendentes podem ser cancelados na área de ingressos. Pagos seguem a política de reembolso do Coffee Match.",
  },
  {
    q: "É seguro?",
    a: "Check-in na porta, votação privada e contato só em match mútuo. Eventos 18+ com regras de conduta.",
  },
  {
    q: "O que é speed dating no Coffee Match?",
    a: "São rodadas presenciais curtas em bar ou restaurante. Depois das conversas, você vota no celular. Só matches mútuos liberam WhatsApp.",
  },
] as const;

const features = [
  {
    title: "Mesas, não feeds",
    description:
      "Noites em bar ou restaurante. Você conversa de verdade — sete minutos que valem mais que mil likes.",
    mark: "I",
  },
  {
    title: "Voto no bolso",
    description:
      "Depois das rodadas, o interesse fica no celular. Privado, sem constrangimento e sem drama na mesa.",
    mark: "II",
  },
  {
    title: "Só o mútuo conta",
    description:
      "Match libera WhatsApp e Instagram. Química recíproca — o resto fica no mistério da noite.",
    mark: "III",
  },
] as const;

const steps = [
  {
    n: "01",
    title: "Chegue com perfil leve",
    description: "Nome, WhatsApp e idade. Sem questionário interminável.",
  },
  {
    n: "02",
    title: "Garanta a cadeira",
    description: "Escolha a noite, pague o ingresso e reserve sua vaga por gênero.",
  },
  {
    n: "03",
    title: "Viva as rodadas",
    description: "Check-in na porta, conversas presenciais e energia de primeira noite.",
  },
  {
    n: "04",
    title: "Vote e conecte",
    description: "Sim ou não no celular. Matches mútuos saem com contato liberado.",
  },
] as const;

export default async function Home() {
  const events = (await listPublishedEvents()).slice(0, 3);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };

  return (
    <div className="flex flex-1 flex-col">
      <JsonLd data={faqJsonLd} />
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="eyebrow mb-5">Coffee Match · Brasil</p>
            <h1 className="font-display max-w-xl text-[2.75rem] font-semibold leading-[1.05] tracking-tight text-[var(--ink)] sm:text-6xl lg:text-[4.1rem]">
              Conectando pessoas.{" "}
              <span className="italic text-[var(--coffee)]">
                Uma xícara por vez.
              </span>
            </h1>
            <p className="pretty mt-6 max-w-lg text-base leading-relaxed text-[var(--muted)] sm:text-lg">
              Noites de speed dating com o clima de um bom café: conversas reais,
              rodadas curtas e matches mútuos no fim. Você só precisa aparecer
              com presença.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/eventos" className="btn btn-primary">
                Ver próximas noites
              </Link>
              <Link href="/cadastro" className="btn btn-secondary">
                Criar conta grátis
              </Link>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--coffee)]" />
                18+
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--coffee)]" />
                Pix e cartão
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--coffee)]" />
                Match mútuo
              </li>
            </ul>
          </div>

          {/* Brand card with logo */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div
              aria-hidden
              className="absolute -inset-6 rounded-[2rem] bg-[radial-gradient(circle_at_50%_40%,color-mix(in_srgb,var(--champagne)_40%,transparent),transparent_65%)] blur-2xl"
            />
            <div className="relative overflow-hidden rounded-[1.75rem] border border-[var(--line)] bg-[linear-gradient(165deg,#1a100c_0%,#2a1a12_45%,#120c09_100%)] p-7 shadow-[var(--shadow-lift)] sm:p-9">
              <div className="flex flex-col items-center text-center">
                <Image
                  src="/logo.jpeg"
                  alt="Coffee Match"
                  width={192}
                  height={192}
                  priority
                  className="float-soft h-40 w-40 rounded-full object-cover shadow-[0_16px_40px_rgba(0,0,0,0.45)] ring-2 ring-[color-mix(in_srgb,var(--champagne)_40%,transparent)] sm:h-48 sm:w-48"
                />
                <p className="font-display mt-6 text-3xl font-medium text-[#f5e6d3] sm:text-4xl">
                  Coffee <span className="text-[var(--champagne)]">Match</span>
                </p>
                <p className="mt-2 max-w-xs text-sm leading-relaxed tracking-wide text-[color-mix(in_srgb,#f5e6d3_70%,transparent)]">
                  Conectando pessoas, uma xícara por vez.
                </p>
              </div>
              <div className="gold-rule my-6 opacity-70" />
              <div className="grid grid-cols-3 gap-3">
                {["Rodadas", "Votos", "Matches"].map((label) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-center backdrop-blur-sm"
                  >
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--champagne-light)]">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Próximas noites */}
      <Reveal as="section" className="px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow mb-3">Agenda</p>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
                Próximas noites
              </h2>
            </div>
            {events.length > 0 ? (
              <Link
                href="/eventos"
                className="text-sm font-semibold text-[var(--carmine)] hover:underline"
              >
                Ver todas →
              </Link>
            ) : null}
          </div>

          {events.length === 0 ? (
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              Agenda em breve.{" "}
              <Link
                href="/eventos"
                className="font-semibold text-[var(--carmine)] hover:underline"
              >
                Ver eventos
              </Link>
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {events.map((event, i) => (
                <Reveal as="li" key={event.id} delay={i * 80}>
                  <EventCard event={event} />
                </Reveal>
              ))}
            </ul>
          )}
        </div>
      </Reveal>

      {/* Features */}
      <Reveal as="section" className="mt-12 px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow mb-3">Por que funciona</p>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
                A noite inteira, desenhada para química
              </h2>
            </div>
          </div>
          <ul className="grid gap-4 md:grid-cols-3">
            {features.map((feature, i) => (
              <Reveal
                as="li"
                key={feature.title}
                delay={i * 90}
                className="surface-card surface-card-hover group p-6 sm:p-7"
              >
                <span className="font-display text-sm font-semibold tracking-[0.2em] text-[var(--champagne)]">
                  {feature.mark}
                </span>
                <h3 className="font-display mt-4 text-2xl font-semibold tracking-tight text-[var(--ink)]">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                  {feature.description}
                </p>
              </Reveal>
            ))}
          </ul>
        </div>
      </Reveal>

      {/* How it works — night band */}
      <Reveal as="section" className="night-band mt-16 px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--champagne-light)]">
            Como funciona
          </p>
          <h2 className="font-display max-w-xl text-3xl font-semibold tracking-tight sm:text-5xl">
            Do ingresso ao WhatsApp em uma noite
          </h2>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <li
                key={step.n}
                className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm"
              >
                <span className="font-display text-2xl font-medium text-[var(--champagne-light)]">
                  {step.n}
                </span>
                <h3 className="mt-3 text-base font-semibold text-[#f8f1ec]">
                  {step.title}
                </h3>
                <p className="muted mt-2 text-sm leading-relaxed">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
          <div className="mt-12 flex flex-col gap-3 sm:flex-row">
            <Link href="/eventos" className="btn btn-on-dark">
              Escolher uma noite
            </Link>
            <Link href="/regras" className="btn btn-outline-on-dark">
              Ver regras da noite
            </Link>
          </div>
        </div>
      </Reveal>

      {/* Social proof */}
      <Reveal as="section" className="px-4 py-10 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-3">
          {[
            { k: "7 min", v: "por conversa — tempo certo para química" },
            { k: "Mútuo", v: "só quem gostou um do outro troca contato" },
            { k: "18+", v: "ambiente adulto, regras claras, respeito" },
          ].map((s, i) => (
            <Reveal
              key={s.k}
              delay={i * 80}
              className="surface-card px-5 py-6 text-center"
            >
              <p className="font-display text-3xl font-semibold text-[var(--coffee)]">
                {s.k}
              </p>
              <p className="mt-2 text-sm text-[var(--muted)]">{s.v}</p>
            </Reveal>
          ))}
        </div>
      </Reveal>

      {/* Apoiador */}
      <Reveal as="section" className="px-4 py-10 sm:px-6">
        <div className="surface-card mx-auto max-w-6xl p-8 sm:p-12">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <p className="eyebrow mb-3">Apoiador</p>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
                Apoie as noites. Fure a fila.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-[var(--muted)] sm:text-base">
                Assinantes ganham o selo ☕ ao lado do nome na cédula de votação
                e compram ingresso antes de todo mundo nas noites concorridas.
                R$ 10 por mês, cancele quando quiser.
              </p>
            </div>
            <div className="shrink-0">
              <Link href="/assinatura" className="btn btn-primary">
                Conhecer a assinatura
              </Link>
            </div>
          </div>
        </div>
      </Reveal>

      {/* FAQ */}
      <Reveal as="section" className="px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <p className="eyebrow mb-3">Dúvidas frequentes</p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
            Antes de sentar à mesa
          </h2>
          <dl className="mt-8 space-y-3">
            {faqs.map((item, i) => (
              <Reveal
                key={item.q}
                delay={i * 60}
                className="surface-card px-5 py-4 sm:px-6 sm:py-5"
              >
                <dt className="font-semibold text-[var(--ink)]">{item.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                  {item.a}
                </dd>
              </Reveal>
            ))}
          </dl>
        </div>
      </Reveal>

      {/* Closing CTA */}
      <Reveal as="section" className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="surface-card mx-auto max-w-6xl overflow-hidden p-0">
          <div className="grid lg:grid-cols-[1.2fr_0.8fr]">
            <div className="p-8 sm:p-12">
              <p className="eyebrow mb-4">Pronto para a próxima mesa?</p>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
                Uma conta. Uma noite. Talvez uma história.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-[var(--muted)] sm:text-base">
                Crie seu perfil em minutos e garanta lugar nas próximas noites
                em São Paulo e outras cidades.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/cadastro" className="btn btn-primary">
                  Criar conta
                </Link>
                <Link href="/eventos" className="btn btn-secondary">
                  Ver eventos
                </Link>
              </div>
            </div>
            <div className="relative min-h-[220px] bg-[linear-gradient(145deg,var(--carmine-deep),#2a0f16_55%,#1a1012)] p-8 text-[#f8f1ec] sm:p-10">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[var(--champagne-light)]">
                Lembrete
              </p>
              <p className="font-display mt-4 text-3xl font-medium leading-snug">
                Respeito na mesa. Coragem na conversa. Discrição no voto.
              </p>
              <p className="mt-4 text-sm text-[color-mix(in_srgb,#f8f1ec_65%,transparent)]">
                Eventos exclusivos para maiores de 18 anos.
              </p>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
