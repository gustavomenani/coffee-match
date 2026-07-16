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
    <main className="page-glow mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl">
          <p className="eyebrow mb-3">Resultados</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-[var(--ink)] sm:text-5xl">
            Seus matches
          </h1>
          <p className="mt-3 text-base text-[var(--muted)]">
            Só match mútuo libera WhatsApp e Instagram.
          </p>
        </div>
        <Link
          href={`/evento/${eventId}/curtidas`}
          className="btn btn-secondary !min-h-10 !px-4 !text-sm"
        >
          Quem te curtiu
        </Link>
      </div>

      {!result.ok ? (
        <div className="surface-card border-[color-mix(in_srgb,var(--champagne)_40%,var(--line))] bg-[color-mix(in_srgb,var(--champagne)_12%,white)] px-5 py-4 text-sm text-[var(--ink-soft)]">
          {result.error}
        </div>
      ) : result.matches.length === 0 ? (
        <div className="surface-card px-6 py-16 text-center">
          <p className="font-display text-2xl font-semibold text-[var(--ink)]">
            Nenhum match ainda
          </p>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[var(--muted)]">
            Nenhum match mútuo nesta noite. Que tal na próxima?
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {result.matches.map((m) => (
            <li key={m.matchId} className="surface-card surface-card-hover p-6 sm:p-7">
              <p className="font-display text-2xl font-semibold tracking-tight text-[var(--ink)]">
                {m.name}
              </p>
              <p className="mt-1 text-xs font-medium tracking-wide text-[var(--muted)]">
                {m.phone}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <a
                  href={m.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary !min-h-10 !px-4 !text-sm"
                >
                  WhatsApp
                </a>
                {m.instagram ? (
                  <a
                    href={`https://instagram.com/${m.instagram.replace(/^@/, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary !min-h-10 !px-4 !text-sm"
                  >
                    Instagram{" "}
                    {m.instagram.startsWith("@") ? m.instagram : `@${m.instagram}`}
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
