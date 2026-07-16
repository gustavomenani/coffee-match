import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page-glow mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 py-20 sm:px-6 sm:py-28">
      <div className="surface-card w-full max-w-lg p-8 text-center sm:p-12">
        <p className="eyebrow mb-3 justify-center">404</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-[var(--ink)] sm:text-5xl">
          Página não encontrada
        </h1>
        <p className="pretty mt-4 text-base leading-relaxed text-[var(--muted)]">
          Esse endereço não existe ou o evento saiu de cartaz. Volte ao início
          ou confira as noites abertas.
        </p>
        <div className="gold-rule my-8" />
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className="btn btn-primary">
            Ir para o início
          </Link>
          <Link href="/eventos" className="btn btn-secondary">
            Ver eventos
          </Link>
        </div>
      </div>
    </main>
  );
}
