import Link from "next/link";

const features = [
  {
    title: "Eventos reais",
    description:
      "Noites presenciais com tempo limitado e conversas face a face — sem app de scroll infinito.",
  },
  {
    title: "Votação no celular",
    description:
      "Depois das rodadas, você curte quem te interessou pelo celular. Rápido, privado e sem pressão no local.",
  },
  {
    title: "Matches mútuos",
    description:
      "Só quem gostou um do outro recebe o contato (WhatsApp). Química de verdade, sem rejeição pública.",
  },
] as const;

const steps = [
  {
    n: "1",
    title: "Cadastro",
    description: "Crie sua conta com dados básicos. É 18+ e leva poucos minutos.",
  },
  {
    n: "2",
    title: "Ingresso",
    description: "Escolha a noite, pague com segurança e garanta sua vaga.",
  },
  {
    n: "3",
    title: "Noite",
    description: "Rodadas curtas de conversa, check-in no local e boa vibe.",
  },
  {
    n: "4",
    title: "Match",
    description: "Vote no celular e receba os matches mútuos com WhatsApp.",
  },
] as const;

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 pb-12 pt-16 text-center sm:pb-16 sm:pt-24">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-rose-600">
          SpeedDate BR
        </p>
        <h1 className="max-w-xl text-4xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-5xl">
          Speed dating de verdade — encontre alguém em uma noite.
        </h1>
        <p className="mt-5 max-w-lg text-base leading-relaxed text-zinc-600 sm:text-lg">
          Eventos presenciais com rodadas curtas, votação no celular e matches
          mútuos com WhatsApp liberado. Sem scroll infinito. Só química real.
        </p>
        <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <Link
            href="/eventos"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-rose-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-rose-700"
          >
            Ver próximos eventos
          </Link>
          <Link
            href="/cadastro"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-zinc-300 bg-white px-6 py-3 text-base font-semibold text-zinc-900 hover:bg-zinc-50"
          >
            Criar conta
          </Link>
        </div>
      </section>

      <section className="border-t border-zinc-100 bg-zinc-50/80 px-4 py-14">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-center text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
            Por que o SpeedDate BR
          </h2>
          <ul className="grid gap-4 sm:grid-cols-3">
            {features.map((feature) => (
              <li
                key={feature.title}
                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
              >
                <h3 className="text-base font-semibold text-rose-700">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                  {feature.description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="px-4 py-14">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-2 text-center text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
            Como funciona
          </h2>
          <p className="mb-8 text-center text-sm text-zinc-600">
            Quatro passos simples do cadastro ao match.
          </p>
          <ol className="grid gap-4 sm:grid-cols-2">
            {steps.map((step) => (
              <li
                key={step.n}
                className="flex gap-4 rounded-2xl border border-zinc-200 bg-white p-5"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-600 text-sm font-bold text-white">
                  {step.n}
                </span>
                <div>
                  <h3 className="font-semibold text-zinc-900">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-600">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/eventos"
              className="inline-flex min-h-11 w-full max-w-xs items-center justify-center rounded-full bg-rose-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 sm:w-auto"
            >
              Ver eventos
            </Link>
            <Link
              href="/cadastro"
              className="inline-flex min-h-11 w-full max-w-xs items-center justify-center rounded-full border border-zinc-300 bg-white px-6 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 sm:w-auto"
            >
              Criar conta
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-200 bg-zinc-50 px-4 py-8">
        <div className="mx-auto max-w-3xl text-center text-sm text-zinc-600">
          <p className="font-medium text-zinc-800">18+ apenas</p>
          <p className="mt-1">
            Eventos exclusivos para maiores de 18 anos. Participação exige
            cadastro com data de nascimento e comportamento respeitoso.
          </p>
        </div>
      </section>
    </div>
  );
}
