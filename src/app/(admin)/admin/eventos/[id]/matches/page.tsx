import Link from "next/link";
import { getAdminSessionMatches } from "@/lib/actions/results";

export default async function AdminMatchesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;
  const result = await getAdminSessionMatches(eventId);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-zinc-900">Matches da noite</h1>
        <Link
          href={`/admin/eventos/${eventId}`}
          className="text-sm font-medium text-zinc-700 underline-offset-2 hover:underline"
        >
          Voltar ao evento
        </Link>
      </div>

      {!result.ok ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {result.error}
        </div>
      ) : result.matches.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-600">
          Nenhum match mútuo nesta sessão.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Pessoa A</th>
                <th className="px-4 py-3 font-medium">Pessoa B</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {result.matches.map((m) => (
                <tr key={m.matchId}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900">{m.userA.name}</p>
                    <p className="text-xs text-zinc-500">
                      {m.userA.phone} · {m.userA.gender}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900">{m.userB.name}</p>
                    <p className="text-xs text-zinc-500">
                      {m.userB.phone} · {m.userB.gender}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.ok ? (
        <p className="mt-4 text-sm text-zinc-500">
          Total: {result.matches.length} par{result.matches.length === 1 ? "" : "es"}
        </p>
      ) : null}
    </main>
  );
}
