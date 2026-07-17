export default function MeusMatchesLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
      <p className="sr-only">Carregando…</p>

      <div aria-hidden className="mb-10 max-w-2xl">
        <div className="skeleton mb-3 h-4 w-24" />
        <div className="skeleton h-10 w-1/2" />
        <div className="skeleton mt-3 h-4 w-3/4" />
      </div>

      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        {[0, 1].map((i) => (
          <div key={i} aria-hidden className="surface-card overflow-hidden">
            <div className="flex items-center gap-4 border-b border-[var(--line)] px-6 py-5">
              <div className="skeleton h-14 w-14 shrink-0 rounded-full" />
              <div className="flex-1">
                <div className="skeleton h-4 w-1/3" />
                <div className="skeleton mt-2 h-6 w-1/2" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 p-5">
              <div className="skeleton h-11 w-32" />
              <div className="skeleton h-11 w-40" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
