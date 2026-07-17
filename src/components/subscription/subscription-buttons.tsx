"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  cancelSubscription,
  startSubscription,
} from "@/lib/actions/subscription";

export function SubscribeButton() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubscribe() {
    setError(null);
    startTransition(async () => {
      const result = await startSubscription();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.location.href = result.initPoint;
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onSubscribe}
        disabled={isPending}
        className="btn btn-primary w-full sm:w-auto"
      >
        {isPending ? "Preparando…" : "Assinar por R$ 10/mês"}
      </button>
      {error ? (
        <p role="alert" className="text-sm font-medium text-[var(--danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function CancelSubscriptionButton() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onCancel() {
    if (!window.confirm("Cancelar sua assinatura de apoiador?")) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelSubscription();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={isPending}
        className="btn btn-secondary !min-h-10 !px-4 !text-sm !text-[var(--danger)]"
      >
        {isPending ? "Cancelando…" : "Cancelar assinatura"}
      </button>
      {error ? (
        <p role="alert" className="text-sm font-medium text-[var(--danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
