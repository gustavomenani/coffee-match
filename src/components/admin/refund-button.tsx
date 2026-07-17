"use client";

import { useState, useTransition } from "react";
import { refundTicket } from "@/lib/actions/refund";

type Props = {
  ticketId: string;
};

export function RefundButton({ ticketId }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onRefund() {
    if (!window.confirm("Confirmar reembolso deste ingresso?")) return;
    setError(null);
    startTransition(async () => {
      const result = await refundTicket(ticketId);
      if (!result.ok) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={onRefund}
        disabled={isPending}
        className="btn btn-secondary !min-h-10 !px-4 !text-sm !text-[var(--danger)]"
      >
        {isPending ? "Reembolsando…" : "Reembolsar"}
      </button>
      {error ? (
        <p className="text-xs font-medium text-[var(--danger)]">{error}</p>
      ) : null}
    </div>
  );
}
