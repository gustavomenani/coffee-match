export default function Loading() {
  return (
    <main className="page-glow mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-xl animate-pulse space-y-6">
        <div className="h-3 w-20 rounded-[var(--radius-pill)] bg-[var(--paper-deep)]" />
        <div className="h-10 w-2/3 max-w-xs rounded-[var(--radius-sm)] bg-[var(--paper-deep)]" />
        <div className="h-4 w-full rounded-[var(--radius-sm)] bg-[var(--paper-deep)]" />
        <div className="h-4 w-5/6 rounded-[var(--radius-sm)] bg-[var(--paper-deep)]" />
        <div className="surface-card mt-4 space-y-4 p-6 sm:p-8">
          <div className="h-11 w-full rounded-[var(--radius-sm)] bg-[var(--paper-deep)]" />
          <div className="h-11 w-full rounded-[var(--radius-sm)] bg-[var(--paper-deep)]" />
          <div className="h-11 w-full rounded-[var(--radius-sm)] bg-[var(--paper-deep)]" />
          <div className="h-11 w-40 rounded-[var(--radius-pill)] bg-[color-mix(in_srgb,var(--carmine)_18%,var(--paper-deep))]" />
        </div>
      </div>
    </main>
  );
}
