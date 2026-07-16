import Link from "next/link";
import { auth } from "@/lib/auth";

const items = [
  { href: "/", label: "Início" },
  { href: "/eventos", label: "Noites" },
  { href: "/meus-ingressos", label: "Ingressos" },
  { href: "/minha-conta", label: "Conta" },
] as const;

export async function MobileDock() {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <nav
      aria-label="Navegação principal mobile"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--paper-card)_92%,transparent)] px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl sm:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4 gap-1">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="flex min-h-12 flex-col items-center justify-center rounded-xl text-[0.7rem] font-semibold text-[var(--ink-soft)] transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_4%,transparent)] hover:text-[var(--carmine)]"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
