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
  const [isPending, startTransition] = useTransition();

  const votedCount = useMemo(() => Object.keys(votes).length, [votes]);

  function onVote(toUserId: string, interest: "yes" | "no") {
    setError(null);
    setPendingId(toUserId);
    startTransition(async () => {
      const result = await castVote({ eventId, toUserId, interest });
      if (!result.ok) {
        setError(result.error);
        setPendingId(null);
        return;
      }
      setVotes((prev) => ({ ...prev, [toUserId]: interest }));
      setPendingId(null);
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
      <div className="surface-card p-4 sm:p-5">
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

          return (
            <li
              key={person.id}
              className="surface-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
            >
              <div className="flex items-center gap-3">
                {person.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={person.photoUrl}
                    alt=""
                    className="h-14 w-14 rounded-full object-cover outline outline-1 outline-[var(--line)]"
                  />
                ) : (
                  <div className="grid h-14 w-14 place-items-center rounded-full bg-[linear-gradient(145deg,var(--carmine-hot),var(--carmine-deep))] text-lg font-semibold text-white">
                    {person.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-display flex items-center gap-2 text-xl font-semibold text-[var(--ink)]">
                    {person.name}
                    {person.supporter ? (
                      <span
                        className="badge badge-soft !text-[0.62rem]"
                        title="Apoiador Coffee Match"
                      >
                        ☕ Apoiador
                      </span>
                    ) : null}
                  </p>
                  {current ? (
                    <p className="text-sm text-[var(--muted)]">
                      Seu voto:{" "}
                      <span className="font-semibold text-[var(--ink-soft)]">
                        {current === "yes" ? "Sim" : "Não"}
                      </span>
                    </p>
                  ) : (
                    <p className="text-sm text-[var(--muted)]">Ainda não votou</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex">
                <button
                  type="button"
                  disabled={busy}
                  aria-pressed={current === "yes"}
                  aria-label={`Sim para ${person.name}`}
                  onClick={() => onVote(person.id, "yes")}
                  className={`btn tap-target !min-h-12 ${
                    current === "yes"
                      ? "btn-primary"
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
                  className={`btn tap-target !min-h-12 ${
                    current === "no"
                      ? "!bg-[var(--ink)] !text-[var(--paper)]"
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
