"use client";

import { useState, useTransition } from "react";
import { checkInTicket } from "@/lib/actions/admin-session";

export type CheckInTicketRow = {
  id: string;
  checkedInAt: string | null;
  user: {
    name: string;
    email: string;
    gender: "male" | "female";
    phone: string;
  };
};

type Props = {
  tickets: CheckInTicketRow[];
};

function genderLabel(g: "male" | "female") {
  return g === "male" ? "Homem" : "Mulher";
}

export function CheckInList({ tickets: initial }: Props) {
  const [tickets, setTickets] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onCheckIn(ticketId: string) {
    setError(null);
    setPendingId(ticketId);
    startTransition(async () => {
      const result = await checkInTicket(ticketId);
      if (!result.ok) {
        setError(result.error);
        setPendingId(null);
        return;
      }
      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId ? { ...t, checkedInAt: new Date().toISOString() } : t,
        ),
      );
      setPendingId(null);
    });
  }

  if (tickets.length === 0) {
    return (
      <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-base text-zinc-700">
        Nenhum ingresso pago neste evento.
      </p>
    );
  }

  const checkedIn = tickets.filter((t) => t.checkedInAt).length;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-600">
        Check-in: {checkedIn} de {tickets.length}
      </p>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <ul className="flex flex-col gap-3">
        {tickets.map((ticket) => {
          const done = !!ticket.checkedInAt;
          const busy = isPending && pendingId === ticket.id;

          return (
            <li
              key={ticket.id}
              className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-lg font-medium text-zinc-900">{ticket.user.name}</p>
                <p className="text-sm text-zinc-600">
                  {genderLabel(ticket.user.gender)} · {ticket.user.phone}
                </p>
                <p className="text-xs text-zinc-400">{ticket.user.email}</p>
              </div>

              {done ? (
                <span className="inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-50 px-5 py-3 text-base font-semibold text-emerald-800 ring-1 ring-emerald-200">
                  Check-in feito
                </span>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onCheckIn(ticket.id)}
                  className="min-h-12 rounded-xl bg-zinc-900 px-6 py-3 text-base font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
                >
                  {busy ? "Confirmando..." : "Fazer check-in"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
