"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Link de navegação do header com estado ativo (aria-current="page")
 * — mesmo critério de rota do MobileDock.
 */
export function NavLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  const active =
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-full px-3 py-2 transition-colors ${
        active
          ? "bg-[color-mix(in_srgb,var(--coffee)_10%,transparent)] font-semibold text-[var(--coffee-deep)]"
          : "hover:bg-[color-mix(in_srgb,var(--ink)_4%,transparent)] hover:text-[var(--ink)]"
      } ${className}`}
    >
      {children}
    </Link>
  );
}
