import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { Logo } from "@/components/brand/logo";
import { NavLink } from "@/components/layout/nav-link";
import { ThemeToggle } from "@/components/theme/theme-toggle";

async function logoutAction() {
  "use server";
  await signOut({ redirectTo: "/" });
}

export async function Header() {
  const session = await auth();
  const isAdmin = session?.user?.role === "admin";

  return (
    <header className="sticky top-0 z-50 bg-[color-mix(in_srgb,var(--paper)_84%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex h-[4.25rem] w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Logo size="md" priority />

        <nav className="flex items-center gap-0.5 text-sm font-medium text-[var(--ink-soft)] sm:gap-1">
          <NavLink href="/eventos">Eventos</NavLink>
          <NavLink href="/meus-ingressos" className="hidden sm:inline-flex">
            Ingressos
          </NavLink>
          {isAdmin ? <NavLink href="/admin">Admin</NavLink> : null}

          <ThemeToggle className="ml-1" />

          {session?.user ? (
            <>
              <NavLink href="/minha-conta">
                <span className="hidden sm:inline">Conta</span>
                <span className="sm:hidden">Eu</span>
              </NavLink>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-full px-3 py-2 transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_4%,transparent)] hover:text-[var(--ink)]"
                >
                  Sair
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="btn btn-primary ml-1 !min-h-10 !px-4 !text-sm"
            >
              Entrar
            </Link>
          )}
        </nav>
      </div>
      {/* 1px coffee caramel gradient line */}
      <div
        aria-hidden
        className="h-px w-full bg-[linear-gradient(90deg,transparent_0%,color-mix(in_srgb,var(--coffee-deep)_35%,transparent)_18%,var(--champagne)_50%,color-mix(in_srgb,var(--coffee)_40%,transparent)_82%,transparent_100%)]"
      />
    </header>
  );
}
