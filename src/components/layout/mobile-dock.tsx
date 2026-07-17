"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  {
    href: "/",
    label: "Início",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/eventos",
    label: "Noites",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M7 4h10v3a5 5 0 0 1-5 5 5 5 0 0 1-5-5V4Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path d="M8 20h8M12 12v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/meus-ingressos",
    label: "Ingressos",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path d="M12 7v10" stroke="currentColor" strokeWidth="1.8" strokeDasharray="2 3" />
      </svg>
    ),
  },
  {
    href: "/minha-conta",
    label: "Conta",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M5 19.5c1.5-3 4-4.5 7-4.5s5.5 1.5 7 4.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
] as const;

export function MobileDock() {
  const pathname = usePathname();

  // Hide on admin routes
  if (pathname.startsWith("/admin")) return null;

  return (
    <nav
      aria-label="Navegação principal mobile"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--paper-card)_94%,transparent)] px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_30px_rgba(26,16,12,0.06)] backdrop-blur-xl sm:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4 gap-0.5">
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-2xl text-[0.68rem] font-semibold transition-colors ${
                  active
                    ? "bg-[color-mix(in_srgb,var(--coffee)_12%,transparent)] text-[var(--coffee-deep)]"
                    : "text-[var(--ink-soft)] hover:bg-[color-mix(in_srgb,var(--ink)_4%,transparent)] hover:text-[var(--coffee)]"
                }`}
              >
                <span
                  className={`transition-transform duration-200 motion-reduce:transition-none ${
                    active ? "scale-110" : "opacity-80"
                  }`}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
