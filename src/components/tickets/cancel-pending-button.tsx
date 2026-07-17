"use client";

import { useState, useTransition } from "react";
import { cancelPendingTicket } from "@/lib/actions/tickets";

type Props = {
  ticketId: string;
};

export function CancelPendingButton({ ticketId }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onCancel() {
    setError(null);
    startTransition(async () => {
      const result = await cancelPendingTicket(ticketId);
      if (!result.ok) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={onCancel}
        disabled={isPending}
        className="btn btn-secondary !min-h-10 !px-4 !text-sm"
      >
        {isPending ? "Cancelando…" : "Cancelar pedido"}
      </button>
      {error ? (
        <p
          role="alert"
          className="text-xs font-medium text-[var(--danger,var(--carmine))]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
