export default function TicketDetailLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="sr-only">Carregando…</p>

      <div aria-hidden className="mb-8">
        <div className="skeleton h-5 w-56" />
      </div>

      <div aria-hidden className="surface-card overflow-hidden">
        <div className="px-6 py-7 sm:px-8 sm:py-9">
          <div className="skeleton mb-3 h-4 w-20" />
          <div className="skeleton h-9 w-3/4" />
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="skeleton h-3 w-12" />
              <div className="skeleton mt-2 h-4 w-2/3" />
            </div>
            <div>
              <div className="skeleton h-3 w-12" />
              <div className="skeleton mt-2 h-4 w-2/3" />
            </div>
            <div className="sm:col-span-2">
              <div className="skeleton h-3 w-16" />
              <div className="skeleton mt-2 h-4 w-1/2" />
            </div>
          </div>
        </div>

        <div className="px-6 py-5 sm:px-8">
          <div className="skeleton h-12 w-full" />
        </div>

        <div className="grid gap-6 px-6 py-8 sm:grid-cols-2 sm:px-8">
          {[0, 1].map((i) => (
            <div key={i}>
              <div className="skeleton h-6 w-40" />
              <div className="skeleton mt-2 h-4 w-3/4" />
              <div className="skeleton mt-4 aspect-square w-full max-w-[280px] rounded-[var(--radius-md)]" />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-[var(--line)] px-6 py-6 sm:px-8">
          <div className="skeleton h-10 w-24 rounded-full" />
          <div className="skeleton h-10 w-24 rounded-full" />
          <div className="skeleton h-10 w-28 rounded-full" />
        </div>
      </div>
    </main>
  );
}
