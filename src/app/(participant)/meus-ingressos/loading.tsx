export default function MeusIngressosLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="sr-only">Carregando…</p>

      <div aria-hidden className="mb-10 max-w-2xl">
        <div className="skeleton mb-3 h-4 w-20" />
        <div className="skeleton h-10 w-1/2" />
        <div className="skeleton mt-3 h-4 w-2/3" />
      </div>

      <div className="flex flex-col gap-4">
        {[0, 1].map((i) => (
          <div
            key={i}
            aria-hidden
            className="surface-card p-6 sm:p-7"
          >
            <div className="skeleton h-6 w-2/3" />
            <div className="skeleton mt-3 h-4 w-1/2" />
            <div className="skeleton mt-2 h-4 w-1/3" />
            <div className="mt-5 flex flex-wrap gap-2">
              <div className="skeleton h-10 w-40" />
              <div className="skeleton h-10 w-24" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
