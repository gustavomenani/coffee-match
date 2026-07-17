import Link from "next/link";
import { Logo } from "@/components/brand/logo";

const links = [
  { href: "/assinatura", label: "Assinatura" },
  { href: "/termos", label: "Termos" },
  { href: "/privacidade", label: "Privacidade" },
  { href: "/regras", label: "Regras" },
  { href: "/reembolso", label: "Reembolso" },
] as const;

export function Footer() {
  return (
    <footer className="mt-auto border-t border-[var(--line)] bg-[linear-gradient(180deg,var(--paper-deep)_0%,color-mix(in_srgb,var(--champagne)_16%,var(--paper-deep))_100%)]">
      <div
        aria-hidden
        className="h-px w-full bg-[linear-gradient(90deg,transparent_0%,color-mix(in_srgb,var(--coffee)_30%,transparent)_20%,var(--champagne)_50%,color-mix(in_srgb,var(--coffee)_30%,transparent)_80%,transparent_100%)]"
      />
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-md space-y-4">
            <Logo href="/" size="md" />
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              Conectando pessoas, uma xícara por vez. Noites presenciais de speed
              dating com rodadas reais, votação no celular e matches mútuos.
            </p>
            <span className="badge badge-18">Somente 18+</span>
          </div>

          <nav
            className="flex flex-wrap gap-x-6 gap-y-2.5 text-sm font-medium text-[var(--ink-soft)] sm:pt-2"
            aria-label="Links do rodapé"
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-[var(--accent-text)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="gold-rule my-9" />

        <p className="text-xs tracking-wide text-[var(--muted)]">
          © {new Date().getFullYear()} Coffee Match · Eventos presenciais · Brasil
        </p>
      </div>
    </footer>
  );
}
