import Link from "next/link";
import { EventCard } from "@/components/events/event-card";
import { listPublishedEvents } from "@/lib/actions/events";

export const dynamic = "force-dynamic";

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

  return (
    <div className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="eyebrow mb-5">Noites de speed dating · Brasil</p>
            <h1 className="font-display max-w-xl text-[2.75rem] font-semibold leading-[1.05] tracking-tight text-[var(--ink)] sm:text-6xl lg:text-[4.1rem]">
              Encontros de verdade.{" "}
              <span className="italic text-[var(--carmine)]">Sem scroll.</span>
            </h1>
            <p className="pretty mt-6 max-w-lg text-base leading-relaxed text-[var(--muted)] sm:text-lg">
              Uma noite, várias conversas, matches mútuos no fim. O SpeedDate BR
              organiza o evento — você só precisa aparecer com presença.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/eventos" className="btn btn-primary">
                Ver próximas noites
              </Link>
              <Link href="/cadastro" className="btn btn-secondary">
                Criar conta grátis
              </Link>
            </div>
            <p className="mt-5 text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
              18+ · Pix e cartão · WhatsApp no match
            </p>
          </div>

          {/* Signature visual: table vignette */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div
              aria-hidden
              className="absolute -inset-6 rounded-[2rem] bg-[radial-gradient(circle_at_50%_40%,color-mix(in_srgb,var(--champagne)_35%,transparent),transparent_65%)] blur-2xl"
            />
            <div className="relative overflow-hidden rounded-[1.75rem] border border-[var(--line)] bg-[linear-gradient(165deg,#1c1014_0%,#2a1219_45%,#120b0e_100%)] p-7 shadow-[var(--shadow-lift)] sm:p-9">
              <div className="flex items-center justify-between text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[color-mix(in_srgb,#f8f1ec_55%,transparent)]">
                <span>Mesa 07</span>
                <span className="text-[var(--champagne-light)]">7 min</span>
              </div>
              <div className="gold-rule my-5 opacity-70" />
              <p className="font-display text-3xl font-medium leading-snug text-[#f8f1ec] sm:text-4xl">
                “Olá. Me conta o que te trouxe até aqui esta noite.”
              </p>
              <p className="mt-4 text-sm leading-relaxed text-[color-mix(in_srgb,#f8f1ec_62%,transparent)]">
                Luz baixa. Tempo contado. Nenhuma notificação competindo com a
                conversa.
              </p>
              <div className="mt-8 grid grid-cols-3 gap-3">
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
      <section className="px-4 py-4 sm:px-6">
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
              {events.map((event) => (
                <li key={event.id}>
                  <EventCard event={event} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="mt-12 px-4 py-4 sm:px-6">
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
            {features.map((feature) => (
              <li
                key={feature.title}
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
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it works — night band */}
      <section className="night-band mt-16 px-4 py-16 sm:px-6 sm:py-20">
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
            <Link
              href="/eventos"
              className="btn btn-primary !bg-[linear-gradient(165deg,#f3e0c8,#c9a27a)] !text-[var(--ink)] !shadow-[0_10px_28px_rgba(201,162,122,0.28)]"
            >
              Escolher uma noite
            </Link>
            <Link
              href="/regras"
              className="btn !border !border-white/20 !bg-transparent !text-[#f8f1ec] hover:!bg-white/10"
            >
              Ver regras da noite
            </Link>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="px-4 py-16 sm:px-6 sm:py-20">
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
      </section>
    </div>
  );
}
