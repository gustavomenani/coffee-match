"use client";

import { useMemo, useState, useTransition } from "react";
import { castVote, type BallotCandidate, type BallotVote } from "@/lib/actions/voting";

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
      <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-base text-zinc-700">
        Nenhuma pessoa do outro gênero fez check-in ainda.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-600">
        Votos registrados: {votedCount} de {candidates.length}
      </p>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
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
              className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                {person.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={person.photoUrl}
                    alt=""
                    className="h-14 w-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-200 text-lg font-semibold text-zinc-600">
                    {person.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-lg font-medium text-zinc-900">{person.name}</p>
                  {current ? (
                    <p className="text-sm text-zinc-500">
                      Seu voto: {current === "yes" ? "Sim" : "Não"}
                    </p>
                  ) : (
                    <p className="text-sm text-zinc-400">Ainda não votou</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onVote(person.id, "yes")}
                  className={`min-h-12 min-w-[7rem] rounded-xl px-5 py-3 text-base font-semibold transition disabled:opacity-60 ${
                    current === "yes"
                      ? "bg-emerald-600 text-white"
                      : "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100"
                  }`}
                >
                  {busy && current !== "no" ? "..." : "Sim"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onVote(person.id, "no")}
                  className={`min-h-12 min-w-[7rem] rounded-xl px-5 py-3 text-base font-semibold transition disabled:opacity-60 ${
                    current === "no"
                      ? "bg-zinc-800 text-white"
                      : "bg-zinc-100 text-zinc-800 ring-1 ring-zinc-200 hover:bg-zinc-200"
                  }`}
                >
                  {busy && current === "no" ? "..." : "Não"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
