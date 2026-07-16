"use client";

import { useState, useTransition, type FormEvent } from "react";
import {
  checkInByTicketId,
  checkInTicket,
} from "@/lib/actions/admin-session";

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
  eventId: string;
  tickets: CheckInTicketRow[];
};

function genderLabel(g: "male" | "female") {
  return g === "male" ? "Homem" : "Mulher";
}

export function CheckInList({ eventId, tickets: initial }: Props) {
  const [tickets, setTickets] = useState(initial);
  const [ticketCode, setTicketCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [codePending, setCodePending] = useState(false);
  const [isPending, startTransition] = useTransition();

  function markCheckedIn(ticketId: string) {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId ? { ...t, checkedInAt: new Date().toISOString() } : t,
      ),
    );
  }

  function onCheckIn(ticketId: string) {
    setError(null);
    setSuccess(null);
    setPendingId(ticketId);
    startTransition(async () => {
      const result = await checkInTicket(ticketId);
      if (!result.ok) {
        setError(result.error);
        setPendingId(null);
        return;
      }
      markCheckedIn(ticketId);
      setPendingId(null);
    });
  }

  function onCheckInByCode(e: FormEvent) {
    e.preventDefault();
    const id = ticketCode.trim();
    if (!id) {
      setError("Informe o código do ingresso.");
      return;
    }

    setError(null);
    setSuccess(null);
    setCodePending(true);
    startTransition(async () => {
      const result = await checkInByTicketId(eventId, id);
      if (!result.ok) {
        setError(result.error);
        setCodePending(false);
        return;
      }

      const known = tickets.some((t) => t.id === id);
      if (known) {
        markCheckedIn(id);
      }
      setSuccess("Check-in confirmado.");
      setTicketCode("");
      setCodePending(false);
    });
  }

  const checkedIn = tickets.filter((t) => t.checkedInAt).length;

  return (
    <div className="flex flex-col gap-5">
      <form
        onSubmit={onCheckInByCode}
        className="surface-card flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:p-5"
      >
        <label className="block min-w-0 flex-1">
          <span className="label">Código do ingresso (ticket ID)</span>
          <input
            type="text"
            name="ticketId"
            value={ticketCode}
            onChange={(e) => setTicketCode(e.target.value)}
            placeholder="Cole o ID do QR / ingresso"
            autoComplete="off"
            className="field font-mono text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={isPending && codePending}
          className="btn btn-primary shrink-0 !min-h-12"
        >
          {isPending && codePending ? "Confirmando..." : "Check-in por código"}
        </button>
      </form>

      {tickets.length > 0 ? (
        <p className="text-sm font-medium text-[var(--muted)]">
          Check-in ·{" "}
          <span className="tabular text-[var(--ink)]">
            {checkedIn}/{tickets.length}
          </span>
        </p>
      ) : null}

      {error ? (
        <p className="rounded-[var(--radius-sm)] border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="rounded-[var(--radius-sm)] border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
          {success}
        </p>
      ) : null}

      {tickets.length === 0 ? (
        <p className="surface-card px-4 py-10 text-center text-base text-[var(--muted)]">
          Nenhum ingresso pago neste evento.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {tickets.map((ticket) => {
            const done = !!ticket.checkedInAt;
            const busy = isPending && pendingId === ticket.id;

            return (
              <li
                key={ticket.id}
                className="surface-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
              >
                <div>
                  <p className="font-display text-xl font-semibold text-[var(--ink)]">
                    {ticket.user.name}
                  </p>
                  <p className="text-sm text-[var(--muted)]">
                    {genderLabel(ticket.user.gender)} · {ticket.user.phone}
                  </p>
                  <p className="text-xs text-[var(--muted)]">{ticket.user.email}</p>
                  <p className="mt-1 font-mono text-[0.7rem] text-[var(--muted)]">
                    {ticket.id}
                  </p>
                </div>

                {done ? (
                  <span className="badge badge-soft inline-flex min-h-12 items-center justify-center px-5 py-3 text-base font-semibold text-emerald-800">
                    Check-in feito
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onCheckIn(ticket.id)}
                    className="btn btn-primary shrink-0 !min-h-12"
                  >
                    {busy ? "Confirmando..." : "Fazer check-in"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
