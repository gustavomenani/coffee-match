"use client";

import { useMemo, useState, useTransition } from "react";
import {
  castVote,
  type BallotCandidate,
  type BallotVote,
} from "@/lib/actions/voting";

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

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-medium text-[var(--muted)]">
        Votos ·{" "}
        <span className="tabular text-[var(--ink)]">
          {votedCount}/{candidates.length}
        </span>
      </p>

      {error ? (
        <p className="rounded-[var(--radius-sm)] border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <ul className="flex flex-col gap-3">
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
                  <p className="font-display text-xl font-semibold text-[var(--ink)]">
                    {person.name}
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
                  onClick={() => onVote(person.id, "no")}
                  className={`btn tap-target !min-h-12 ${
                    current === "no"
                      ? "!bg-[var(--ink)] !text-white"
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
