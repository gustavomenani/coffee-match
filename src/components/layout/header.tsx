import Link from "next/link";
import { auth, signOut } from "@/lib/auth";

async function logoutAction() {
  "use server";
  await signOut({ redirectTo: "/" });
}

export async function Header() {
  const session = await auth();
  const isAdmin = session?.user?.role === "admin";

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--paper)_82%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex h-[4.25rem] w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <span
            aria-hidden
            className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[var(--carmine-hot)] to-[var(--carmine-deep)] text-sm font-semibold text-white shadow-[0_8px_20px_color-mix(in_srgb,var(--carmine)_35%,transparent)]"
          >
            S
          </span>
          <span className="leading-tight">
            <span className="font-display block text-[1.35rem] font-semibold tracking-tight text-[var(--ink)] transition-colors group-hover:text-[var(--carmine)]">
              SpeedDate
            </span>
            <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
              Brasil · 18+
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-0.5 text-sm font-medium text-[var(--ink-soft)] sm:gap-1">
          <Link
            href="/eventos"
            className="rounded-full px-3 py-2 transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_4%,transparent)] hover:text-[var(--ink)]"
          >
            Eventos
          </Link>
          <Link
            href="/meus-ingressos"
            className="hidden rounded-full px-3 py-2 transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_4%,transparent)] hover:text-[var(--ink)] sm:inline-flex"
          >
            Ingressos
          </Link>
          {isAdmin ? (
            <Link
              href="/admin"
              className="rounded-full px-3 py-2 transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_4%,transparent)] hover:text-[var(--ink)]"
            >
              Admin
            </Link>
          ) : null}

          {session?.user ? (
            <>
              <Link
                href="/minha-conta"
                className="rounded-full px-3 py-2 transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_4%,transparent)] hover:text-[var(--ink)]"
              >
                <span className="hidden sm:inline">Conta</span>
                <span className="sm:hidden">Eu</span>
              </Link>
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
            <Link href="/login" className="btn btn-primary ml-1 !min-h-10 !px-4 !text-sm">
              Entrar
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
