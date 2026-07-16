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
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-4">
        <Link href="/" className="text-base font-bold tracking-tight text-rose-600">
          SpeedDate BR
        </Link>

        <nav className="flex items-center gap-1 text-sm font-medium text-zinc-700 sm:gap-2">
          <Link
            href="/eventos"
            className="rounded-md px-2 py-2 hover:bg-zinc-100 hover:text-zinc-900 sm:px-3"
          >
            Eventos
          </Link>
          <Link
            href="/meus-ingressos"
            className="rounded-md px-2 py-2 hover:bg-zinc-100 hover:text-zinc-900 sm:px-3"
          >
            <span className="hidden sm:inline">Meus ingressos</span>
            <span className="sm:hidden">Ingressos</span>
          </Link>
          {isAdmin ? (
            <Link
              href="/admin"
              className="rounded-md px-2 py-2 hover:bg-zinc-100 hover:text-zinc-900 sm:px-3"
            >
              Admin
            </Link>
          ) : null}

          {session?.user ? (
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-md px-2 py-2 hover:bg-zinc-100 hover:text-zinc-900 sm:px-3"
              >
                Sair
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-zinc-900 px-3 py-2 text-white hover:bg-zinc-800"
            >
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
