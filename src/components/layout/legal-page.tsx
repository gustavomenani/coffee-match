import type { ReactNode } from "react";

type LegalPageProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function LegalPage({
  eyebrow = "Legal",
  title,
  subtitle,
  children,
}: LegalPageProps) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
      <p className="eyebrow mb-3">{eyebrow}</p>
      <h1 className="font-display text-4xl font-semibold tracking-tight text-[var(--ink)] sm:text-5xl">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-3 text-base text-[var(--muted)]">{subtitle}</p>
      ) : null}
      <div className="surface-card mt-8 max-w-none space-y-4 p-6 text-[var(--muted)] sm:p-8 [&_a]:font-medium [&_a]:text-[var(--carmine)] [&_a]:no-underline hover:[&_a]:underline [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-[var(--ink)] [&_li]:leading-relaxed [&_p]:leading-relaxed [&_strong]:font-semibold [&_strong]:text-[var(--ink-soft)]">
        {children}
      </div>
    </main>
  );
}
