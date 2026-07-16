import Link from "next/link";

const links = [
  { href: "/termos", label: "Termos" },
  { href: "/privacidade", label: "Privacidade" },
  { href: "/regras", label: "Regras" },
  { href: "/reembolso", label: "Reembolso" },
] as const;

export function Footer() {
  return (
    <footer className="mt-auto border-t border-[var(--line)] bg-[var(--paper-deep)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-md space-y-3">
            <p className="font-display text-2xl font-semibold tracking-tight text-[var(--ink)]">
              SpeedDate BR
            </p>
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              Noites presenciais de speed dating com rodadas reais, votação no
              celular e matches mútuos. Química sem o caos do app.
            </p>
            <span className="badge badge-18">Somente 18+</span>
          </div>

          <nav
            className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-[var(--ink-soft)]"
            aria-label="Legal"
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-[var(--carmine)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="gold-rule my-8" />

        <p className="text-xs text-[var(--muted)]">
          © {new Date().getFullYear()} SpeedDate BR · Eventos presenciais · Brasil
        </p>
      </div>
    </footer>
  );
}
