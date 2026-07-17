"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import {
  checkInByTicketId,
  checkInTicket,
  listCheckIns,
} from "@/lib/actions/admin-session";
import { QrScanner } from "@/components/admin/qr-scanner";

const CUID_SEGMENT = /^[a-z][a-z0-9]{19,39}$/i;

/**
 * The door QR encodes the raw ticket id (cuid), but tolerate URL payloads
 * too: pick the last path segment that looks like a cuid.
 */
function extractTicketCode(text: string): string {
  const raw = text.trim();
  try {
    const url = new URL(raw);
    const segments = url.pathname.split("/").filter(Boolean);
    for (let i = segments.length - 1; i >= 0; i--) {
      if (CUID_SEGMENT.test(segments[i])) return segments[i];
    }
    return raw;
  } catch {
    return raw;
  }
}

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

  // Live refresh: poll the server every 10s so check-ins made by another
  // admin (another phone at the door) show up without a manual reload.
  const isPendingRef = useRef(isPending);
  useEffect(() => {
    isPendingRef.current = isPending;
  }, [isPending]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function tick() {
      // Never clobber an optimistic update while a check-in is in flight.
      if (isPendingRef.current) return;
      const result = await listCheckIns(eventId);
      if (cancelled || isPendingRef.current) return;
      if (result.ok) setTickets(result.tickets);
    }

    function start() {
      if (timer === null) timer = setInterval(() => void tick(), 10_000);
    }
    function stop() {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    }
    function onVisibilityChange() {
      if (document.hidden) stop();
      else start();
    }

    onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [eventId]);

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
      const result = await checkInTicket(eventId, ticketId);
      if (!result.ok) {
        setError(result.error);
        setPendingId(null);
        return;
      }
      markCheckedIn(ticketId);
      setPendingId(null);
    });
  }

  function submitCode(id: string) {
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

  function onCheckInByCode(e: FormEvent) {
    e.preventDefault();
    const id = ticketCode.trim();
    if (!id) {
      setError("Informe o código do ingresso.");
      return;
    }
    submitCode(id);
  }

  function onScannedCode(text: string) {
    const id = extractTicketCode(text);
    setTicketCode(id);
    submitCode(id);
  }

  const checkedIn = tickets.filter((t) => t.checkedInAt).length;

  return (
    <div className="flex flex-col gap-5">
      <QrScanner onCode={onScannedCode} />

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
          className="btn btn-primary btn-lg shrink-0"
        >
          {isPending && codePending ? "Confirmando…" : "Check-in por código"}
        </button>
      </form>

      {tickets.length > 0 ? (
        <p className="flex flex-wrap items-baseline gap-x-3 text-sm font-medium text-[var(--muted)]">
          <span>
            Check-in ·{" "}
            <span className="tabular text-[var(--ink)]">
              {checkedIn}/{tickets.length}
            </span>
          </span>
          <span className="text-xs font-normal text-[var(--muted)]">
            Atualizado automaticamente
          </span>
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="flash-error rounded-[var(--radius-sm)] px-3 py-3 text-sm"
        >
          {error}
        </p>
      ) : null}

      {success ? (
        <p
          role="status"
          aria-live="polite"
          className="flash-success rounded-[var(--radius-sm)] px-3 py-3 text-sm"
        >
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
                  <span className="badge badge-soft inline-flex min-h-12 items-center justify-center px-5 py-3 text-base font-semibold text-[var(--success)]">
                    Check-in feito
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onCheckIn(ticket.id)}
                    className="btn btn-primary btn-lg shrink-0"
                  >
                    {busy ? "Confirmando…" : "Fazer check-in"}
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
