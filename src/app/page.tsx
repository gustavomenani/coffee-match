import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:py-24">
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

      <footer className="border-t border-zinc-200 bg-zinc-50 px-4 py-8">
        <div className="mx-auto max-w-3xl text-center text-sm text-zinc-600">
          <p className="font-medium text-zinc-800">18+ apenas</p>
          <p className="mt-1">
            Eventos exclusivos para maiores de 18 anos. Participação exige
            cadastro com data de nascimento e comportamento respeitoso.
          </p>
          <p className="mt-4 text-xs text-zinc-400">
            © {new Date().getFullYear()} SpeedDate BR
          </p>
        </div>
      </footer>
    </div>
  );
}
