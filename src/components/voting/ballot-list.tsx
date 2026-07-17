"use client";

import { useMemo, useState, useTransition } from "react";
import {
  castVote,
  type BallotCandidate,
  type BallotVote,
} from "@/lib/actions/voting";
import { ProgressBar } from "@/components/ui/progress-bar";

type Props = {
  eventId: string;
  candidates: BallotCandidate[];
  initialVotes: BallotVote[];
};

export function BallotList({ eventId, candidates, initialVotes }: Props) {
  const [votes, setVotes] = useState<Record<string, "yes" | "no">>(() => {
    const map: Record<string, "yes" | "no"> = {};
    for (const v of initialVotes) {
      map[v.toUserId] = v.interest;
    }
    return map;
  });
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const votedCount = useMemo(() => Object.keys(votes).length, [votes]);

  function onVote(toUserId: string, interest: "yes" | "no") {
    setError(null);
    setPendingId(toUserId);
    startTransition(async () => {
      try {
        const result = await castVote({ eventId, toUserId, interest });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setVotes((prev) => ({ ...prev, [toUserId]: interest }));
      } catch {
        // Bad bar wifi rejected the action. Without this the tap was lost
        // silently — the vote never registered and nothing said so.
        setError("Sem conexão. Toque de novo para registrar o voto.");
      } finally {
        setPendingId(null);
      }
    });
  }

  if (candidates.length === 0) {
    return (
      <p className="surface-card px-4 py-10 text-center text-base text-[var(--muted)]">
        Nenhuma pessoa do outro gênero fez check-in ainda.
      </p>
    );
  }

  const allDone = votedCount >= candidates.length && candidates.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="surface-card relative overflow-hidden p-4 pt-5 sm:p-5 sm:pt-6">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--coffee-deep),var(--coffee-hot),var(--champagne))]"
        />
        <ProgressBar
          value={votedCount}
          max={candidates.length}
          label="Progresso da cédula"
        />
        {allDone ? (
          <p className="mt-3 text-sm font-medium text-[var(--success)]">
            Cédula completa. Você pode mudar um voto até o admin encerrar.
          </p>
        ) : (
          <p className="mt-3 text-sm text-[var(--muted)]">
            Marque Sim ou Não para cada pessoa. Dá para alterar até o fim da
            votação.
          </p>
        )}
      </div>

      {error ? (
        <p
          role="alert"
          className="flash-error rounded-[var(--radius-sm)] px-3 py-3 text-sm"
        >
          {error}
        </p>
      ) : null}

      <ul className="stagger flex flex-col gap-3">
        {candidates.map((person) => {
          const current = votes[person.id];
          const busy = isPending && pendingId === person.id;
          const expanded = expandedId === person.id;
          const panelId = `ballot-panel-${person.id}`;

          return (
            <li
              key={person.id}
              className="surface-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
            >
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  aria-label={`Ver perfil de ${person.name}`}
                  onClick={() =>
                    setExpandedId(expanded ? null : person.id)
                  }
                  className="flex w-full items-center gap-3 rounded-[var(--radius-sm)] text-left"
                >
                  {person.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={person.photoUrl}
                      alt=""
                      className={`${
                        expanded
                          ? "h-28 w-28 outline-2 outline-[color-mix(in_srgb,var(--champagne)_70%,transparent)] shadow-[var(--shadow-soft)]"
                          : "h-14 w-14 outline-1 outline-[var(--line)]"
                      } shrink-0 rounded-full object-cover outline transition-all duration-300 ease-out`}
                    />
                  ) : (
                    <div
                      className={`grid ${
                        expanded ? "h-28 w-28 text-3xl" : "h-14 w-14 text-lg"
                      } shrink-0 place-items-center rounded-full bg-[linear-gradient(145deg,var(--carmine-hot),var(--carmine-deep))] font-semibold text-white transition-all duration-300 ease-out`}
                    >
                      {person.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-display flex flex-wrap items-center gap-2 text-xl font-semibold text-[var(--ink)]">
                      {person.name} · {person.age}
                      {person.supporter ? (
                        <span
                          className="badge badge-soft !text-[0.62rem]"
                          title="Apoiador Coffee Match"
                        >
                          ☕ Apoiador
                        </span>
                      ) : null}
                    </p>
                    {!expanded && person.bio ? (
                      <p className="text-sm text-[var(--muted)] line-clamp-2">
                        {person.bio}
                      </p>
                    ) : null}
                    {!expanded && person.interests.length > 0 ? (
                      <p className="mt-1 flex flex-wrap gap-1">
                        {person.interests.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="badge badge-soft !text-[0.6rem]"
                          >
                            {tag}
                          </span>
                        ))}
                      </p>
                    ) : null}
                  </div>
                </button>

                {expanded ? (
                  <div id={panelId} className="animate-rise mt-3">
                    {person.bio ? (
                      <p className="text-sm text-[var(--muted)]">
                        {person.bio}
                      </p>
                    ) : null}
                    {person.interests.length > 0 ? (
                      <p className="mt-2 flex flex-wrap gap-1">
                        {person.interests.map((tag) => (
                          <span
                            key={tag}
                            className="badge badge-soft !text-[0.6rem]"
                          >
                            {tag}
                          </span>
                        ))}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {current ? (
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Seu voto:{" "}
                    <span
                      className={`font-semibold ${
                        current === "yes"
                          ? "text-[var(--success)]"
                          : "text-[var(--ink-soft)]"
                      }`}
                    >
                      {current === "yes" ? "Sim" : "Não"}
                    </span>
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Ainda não votou
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex">
                <button
                  type="button"
                  disabled={busy}
                  aria-pressed={current === "yes"}
                  aria-label={`Sim para ${person.name}`}
                  onClick={() => onVote(person.id, "yes")}
                  className={`btn tap-target !min-h-12 sm:!min-w-[6.25rem] ${
                    current === "yes"
                      ? "btn-primary border border-transparent"
                      : "btn-secondary"
                  }`}
                >
                  Sim
                </button>
                <button
                  type="button"
                  disabled={busy}
                  aria-pressed={current === "no"}
                  aria-label={`Não para ${person.name}`}
                  onClick={() => onVote(person.id, "no")}
                  className={`btn tap-target !min-h-12 sm:!min-w-[6.25rem] ${
                    current === "no"
                      ? "border border-transparent !bg-[var(--ink)] !text-[var(--paper)]"
                      : "btn-secondary"
                  }`}
                >
                  Não
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
