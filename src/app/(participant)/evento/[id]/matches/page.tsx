import Link from "next/link";
import { getMyMatches } from "@/lib/actions/results";
import { PageShell, EmptyState, Flash } from "@/components/ui/page-shell";

export default async function MatchesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;
  const result = await getMyMatches(eventId);

  return (
    <PageShell
      eyebrow="Resultados da noite"
      title="Seus matches"
      description="Contato liberado só quando o interesse foi mútuo."
      actions={
        <Link
          href={`/evento/${eventId}/curtidas`}
          className="btn btn-secondary !min-h-10 !text-sm"
        >
          Quem te curtiu
        </Link>
      }
    >
      {!result.ok ? (
        <Flash tone="warning">{result.error}</Flash>
      ) : result.matches.length === 0 ? (
        <EmptyState
          title="Nenhum match mútuo"
          description="Desta vez não rolou reciprocidade. Na próxima noite, outra mesa — outra história."
          action={
            <Link href="/eventos" className="btn btn-primary">
              Ver próximas noites
            </Link>
          }
        />
      ) : (
        <ul className="stagger mx-auto grid max-w-2xl gap-4">
          {result.matches.map((m) => (
            <li key={m.matchId} className="surface-card overflow-hidden">
              <div className="border-b border-[var(--line)] bg-[linear-gradient(165deg,color-mix(in_srgb,var(--carmine)_8%,var(--paper-card)),var(--paper-card))] px-6 py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--champagne)]">
                  Match mútuo
                </p>
                <p className="font-display mt-1 text-3xl font-semibold text-[var(--ink)]">
                  {m.name}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 p-5">
                <a
                  href={m.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary !min-h-11"
                >
                  WhatsApp
                </a>
                {m.instagram ? (
                  <a
                    href={`https://instagram.com/${m.instagram.replace(/^@/, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary !min-h-11"
                  >
                    Instagram @{m.instagram.replace(/^@/, "")}
                  </a>
                ) : null}
              </div>
              <p className="px-5 pb-5 text-xs text-[var(--muted)]">{m.phone}</p>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
