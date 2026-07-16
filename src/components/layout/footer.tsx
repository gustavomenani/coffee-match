import Link from "next/link";

const links = [
  { href: "/termos", label: "Termos" },
  { href: "/privacidade", label: "Privacidade" },
  { href: "/regras", label: "Regras" },
  { href: "/reembolso", label: "Reembolso" },
] as const;

export function Footer() {
  return (
    <footer className="mt-auto border-t border-zinc-200 bg-zinc-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 text-sm text-zinc-600">
          <p className="font-semibold text-zinc-900">
            SpeedDate BR{" "}
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">
              18+
            </span>
          </p>
          <p className="text-xs text-zinc-500">
            Eventos presenciais de speed dating. Apenas maiores de 18 anos.
          </p>
          <p className="text-xs text-zinc-400">
            © {new Date().getFullYear()} SpeedDate BR
          </p>
        </div>

        <nav
          className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-medium text-zinc-700"
          aria-label="Legal"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-rose-600 hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
