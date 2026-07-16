import Link from "next/link";
import { getMyMatches } from "@/lib/actions/results";

export default async function MatchesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;
  const result = await getMyMatches(eventId);

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-zinc-900">Seus matches</h1>
        <Link
          href={`/evento/${eventId}/curtidas`}
          className="text-sm font-medium text-rose-600 underline-offset-2 hover:underline"
        >
          Quem te curtiu
        </Link>
      </div>

      {!result.ok ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {result.error}
        </div>
      ) : result.matches.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-600">
          Nenhum match mútuo ainda. Que tal na próxima?
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {result.matches.map((m) => (
            <li
              key={m.matchId}
              className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <p className="text-lg font-semibold text-zinc-900">{m.name}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={m.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  WhatsApp
                </a>
                {m.instagram ? (
                  <a
                    href={`https://instagram.com/${m.instagram.replace(/^@/, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center justify-center rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                  >
                    Instagram {m.instagram.startsWith("@") ? m.instagram : `@${m.instagram}`}
                  </a>
                ) : null}
              </div>
              <p className="mt-2 text-xs text-zinc-500">{m.phone}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
