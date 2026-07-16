import Link from "next/link";
import { requireAdmin } from "@/lib/actions/admin";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requireAdmin();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900">Admin</h1>
      <p className="mb-8 text-sm text-zinc-600">
        Painel SpeedDate BR — gestão de eventos e operação da noite.
      </p>

      <ul className="flex flex-col gap-3">
        <li>
          <Link
            href="/admin/eventos"
            className="block rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm transition hover:border-zinc-400"
          >
            <span className="font-medium text-zinc-900">Eventos</span>
            <p className="mt-1 text-sm text-zinc-600">
              Listar, criar e editar noites de speed dating.
            </p>
          </Link>
        </li>
        <li>
          <Link
            href="/admin/eventos/novo"
            className="block rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm transition hover:border-zinc-400"
          >
            <span className="font-medium text-zinc-900">Novo evento</span>
            <p className="mt-1 text-sm text-zinc-600">
              Cadastrar data, local, capacidades e preço.
            </p>
          </Link>
        </li>
      </ul>
    </main>
  );
}
