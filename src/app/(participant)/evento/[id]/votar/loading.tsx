export default function VotarLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="sr-only">Carregando…</p>

      <div className="mx-auto max-w-lg" aria-hidden>
        <div className="skeleton mb-3 h-4 w-24" />
        <div className="skeleton h-10 w-48" />
        <div className="skeleton mt-2 h-4 w-2/3" />
        <div className="skeleton mt-3 h-4 w-full" />

        <div className="mt-8 flex flex-col gap-4">
          <div className="surface-card p-4 sm:p-5">
            <div className="skeleton h-4 w-1/2" />
            <div className="skeleton mt-3 h-2 w-full rounded-full" />
            <div className="skeleton mt-3 h-4 w-3/4" />
          </div>

          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="surface-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="skeleton h-14 w-14 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1">
                  <div className="skeleton h-5 w-1/2" />
                  <div className="skeleton mt-2 h-4 w-3/4" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <div className="skeleton h-12 w-full rounded-full sm:w-[6.25rem]" />
                <div className="skeleton h-12 w-full rounded-full sm:w-[6.25rem]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
