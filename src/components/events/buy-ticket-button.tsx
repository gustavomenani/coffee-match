"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  eventId: string;
  disabled?: boolean;
  label?: string;
  className?: string;
};

export function BuyTicketButton({
  eventId,
  disabled = false,
  label = "Comprar ingresso",
  className,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      const data = (await res.json().catch(() => null)) as {
        initPoint?: string;
        error?: string;
      } | null;

      if (!res.ok || !data?.initPoint) {
        setError(data?.error ?? "Não foi possível iniciar o pagamento.");
        setLoading(false);
        return;
      }

      if (data.initPoint.startsWith("http")) {
        window.location.href = data.initPoint;
      } else {
        router.push(data.initPoint);
      }
    } catch {
      setError("Erro de rede. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || loading}
        className={
          className ??
          "rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        }
      >
        {loading ? "Processando…" : label}
      </button>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
