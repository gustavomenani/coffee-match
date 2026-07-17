import type { ReactNode } from "react";

export function PageShell({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          {eyebrow ? <p className="eyebrow mb-3">{eyebrow}</p> : null}
          <h1 className="font-display text-4xl font-semibold tracking-tight text-[var(--ink)] sm:text-5xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-3 text-base leading-relaxed text-[var(--muted)]">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </main>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="surface-card px-6 py-16 text-center sm:px-10">
      <div
        aria-hidden
        className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-[color-mix(in_srgb,var(--coffee)_12%,var(--paper-deep))] text-xl text-[var(--coffee)]"
      >
        ◦
      </div>
      <p className="font-display text-2xl font-semibold text-[var(--ink)]">
        {title}
      </p>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[var(--muted)]">
        {description}
      </p>
      {action ? <div className="mt-8 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Flash({
  tone = "info",
  children,
}: {
  tone?: "info" | "success" | "error" | "warning";
  children: ReactNode;
}) {
  const styles = {
    info: "border border-[var(--line-strong)] bg-[var(--paper-deep)] text-[var(--ink-soft)]",
    success: "flash-success",
    error: "flash-error",
    warning: "flash-warning",
  } as const;

  return (
    <div
      role="status"
      className={`rounded-[var(--radius-sm)] px-4 py-3 text-sm leading-relaxed ${styles[tone]}`}
    >
      {children}
    </div>
  );
}
