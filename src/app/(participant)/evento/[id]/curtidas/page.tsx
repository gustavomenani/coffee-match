import Link from "next/link";
import { getWhoLikedMe } from "@/lib/actions/results";

export default async function CurtidasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;
  const result = await getWhoLikedMe(eventId);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl">
          <p className="eyebrow mb-3">Resultados</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-[var(--ink)] sm:text-5xl">
            Quem te curtiu
          </h1>
          <p className="mt-3 text-base leading-relaxed text-[var(--muted)]">
            Contato (WhatsApp/Instagram) só é liberado em match mútuo.
          </p>
        </div>
        <Link
          href={`/evento/${eventId}/matches`}
          className="btn btn-secondary !min-h-10 !px-4 !text-sm"
        >
          Ver matches
        </Link>
      </div>

      {!result.ok ? (
        // var(--paper-card) (não `white`): mantém contraste no tema escuro
        <div
          role="status"
          className="surface-card max-w-2xl border-[color-mix(in_srgb,var(--champagne)_40%,var(--line))] bg-[color-mix(in_srgb,var(--champagne)_12%,var(--paper-card))] px-5 py-4 text-sm text-[var(--ink-soft)]"
        >
          {result.error}
        </div>
      ) : result.likes.length === 0 ? (
        <div className="surface-card max-w-2xl px-6 py-16 text-center">
          <p className="font-display text-2xl font-semibold text-[var(--ink)]">
            Nenhuma curtida
          </p>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[var(--muted)]">
            Ninguém te curtiu nesta noite — ou a votação ainda não encerrou.
          </p>
        </div>
      ) : (
        <ul className="surface-card max-w-2xl divide-y divide-[var(--line)] overflow-hidden">
          {result.likes.map((like) => (
            <li
              key={like.userId}
              className="flex items-center gap-3 px-5 py-4 sm:px-6"
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--carmine)_12%,var(--paper-card))] font-display text-sm font-semibold text-[var(--carmine-deep)]"
                aria-hidden
              >
                {like.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="font-display text-lg font-semibold tracking-tight text-[var(--ink)]">
                {like.name}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
