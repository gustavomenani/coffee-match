export default function MeusIngressosLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="sr-only">Carregando…</p>

      <div
        aria-hidden
        className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
      >
        <div className="max-w-2xl flex-1">
          <div className="skeleton mb-3 h-4 w-20" />
          <div className="skeleton h-10 w-1/2" />
          <div className="skeleton mt-3 h-4 w-2/3" />
        </div>
        <div className="skeleton h-10 w-36 rounded-full" />
      </div>

      <div className="flex flex-col gap-4">
        {[0, 1].map((i) => (
          <div
            key={i}
            aria-hidden
            className="surface-card p-6 sm:p-7"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="skeleton h-6 w-2/3" />
                <div className="skeleton mt-3 h-4 w-1/2" />
                <div className="skeleton mt-2 h-4 w-1/3" />
              </div>
              <div className="skeleton h-6 w-16 rounded-full" />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <div className="skeleton h-10 w-40 rounded-full" />
              <div className="skeleton h-10 w-24 rounded-full" />
              <div className="skeleton h-10 w-24 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
