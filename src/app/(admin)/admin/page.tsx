import Link from "next/link";
import { requireAdmin } from "@/lib/actions/admin";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requireAdmin();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="eyebrow mb-3">Operação</p>
      <h1 className="font-display text-4xl font-semibold tracking-tight text-[var(--ink)] sm:text-5xl">
        Painel admin
      </h1>
      <p className="mt-3 max-w-xl text-base text-[var(--muted)]">
        Publique noites, faça check-in e abra a votação — o coração da operação.
      </p>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        <li>
          <Link href="/admin/eventos" className="surface-card surface-card-hover block p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--champagne)]">
              Agenda
            </p>
            <span className="font-display mt-2 block text-2xl font-semibold text-[var(--ink)]">
              Eventos
            </span>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Listar, editar e acompanhar vagas.
            </p>
          </Link>
        </li>
        <li>
          <Link
            href="/admin/eventos/novo"
            className="surface-card surface-card-hover block p-7"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--champagne)]">
              Criar
            </p>
            <span className="font-display mt-2 block text-2xl font-semibold text-[var(--ink)]">
              Nova noite
            </span>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Data, local, capacidades e preço.
            </p>
          </Link>
        </li>
      </ul>
    </main>
  );
}
