import Link from "next/link";
import { getAdminSessionMatches } from "@/lib/actions/results";

function genderLabel(gender: string) {
  return gender === "male" ? "Homem" : gender === "female" ? "Mulher" : gender;
}

export default async function AdminMatchesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;
  const result = await getAdminSessionMatches(eventId);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl">
          <Link
            href={`/admin/eventos/${eventId}`}
            className="mb-3 inline-block text-sm font-semibold text-[var(--muted)] hover:text-[var(--carmine)]"
          >
            ← Evento
          </Link>
          <p className="eyebrow mb-3">Resultados</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-[var(--ink)] sm:text-5xl">
            Matches da noite
          </h1>
        </div>
        <Link
          href={`/admin/eventos/${eventId}/noite`}
          className="btn btn-secondary"
        >
          Operação da noite
        </Link>
      </div>

      {!result.ok ? (
        <div
          role="alert"
          className="flash-error max-w-2xl rounded-[var(--radius-sm)] px-4 py-3 text-sm"
        >
          {result.error}
        </div>
      ) : result.matches.length === 0 ? (
        <div className="surface-card max-w-2xl px-6 py-16 text-center">
          <p className="font-display text-2xl font-semibold text-[var(--ink)]">
            Nenhum match mútuo
          </p>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[var(--muted)]">
            Ainda não há pares recíprocos nesta sessão.
          </p>
        </div>
      ) : (
        <div className="surface-card max-w-3xl overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-[var(--line)] bg-[var(--paper-deep)] text-xs uppercase tracking-wider text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Pessoa A</th>
                <th className="px-4 py-3 font-semibold">Pessoa B</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {result.matches.map((m) => (
                <tr key={m.matchId}>
                  <td className="px-4 py-4">
                    <p className="font-display text-base font-semibold text-[var(--ink)]">
                      {m.userA.name}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {m.userA.phone} · {genderLabel(m.userA.gender)}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-display text-base font-semibold text-[var(--ink)]">
                      {m.userB.name}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {m.userB.phone} · {genderLabel(m.userB.gender)}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.ok ? (
        <p className="mt-4 text-sm text-[var(--muted)]">
          Total:{" "}
          <span className="tabular font-semibold text-[var(--ink)]">
            {result.matches.length}
          </span>{" "}
          par{result.matches.length === 1 ? "" : "es"}
        </p>
      ) : null}
    </main>
  );
}
