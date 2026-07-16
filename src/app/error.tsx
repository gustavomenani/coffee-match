"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="page-glow mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 py-20 sm:px-6 sm:py-28">
      <div className="surface-card w-full max-w-lg p-8 text-center sm:p-12">
        <p className="eyebrow mb-3 justify-center">Erro</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-[var(--ink)] sm:text-5xl">
          Algo deu errado
        </h1>
        <p className="pretty mt-4 text-base leading-relaxed text-[var(--muted)]">
          Não conseguimos carregar esta página. Tente de novo — se o problema
          continuar, volte em instantes.
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-xs text-[var(--muted)]">
            Ref: {error.digest}
          </p>
        ) : null}
        <div className="gold-rule my-8" />
        <button type="button" onClick={reset} className="btn btn-primary">
          Tentar novamente
        </button>
      </div>
    </main>
  );
}
