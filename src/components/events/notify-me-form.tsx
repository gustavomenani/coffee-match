"use client";

import { useState } from "react";
import { registerEventInterest } from "@/lib/actions/event-interest";
import { SubmitButton } from "@/components/ui/submit-button";

type NotifyMeFormProps = {
  eventId: string;
};

export function NotifyMeForm({ eventId }: NotifyMeFormProps) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <p
        role="status"
        className="flash-success rounded-[var(--radius-sm)] px-4 py-3 text-sm"
      >
        Anotado! Você será avisado(a).
      </p>
    );
  }

  async function submit(formData: FormData) {
    setError(null);
    const result = await registerEventInterest(formData);
    if (result.ok) {
      setDone(true);
    } else {
      setError(result.error);
    }
  }

  return (
    <form action={submit} className="relative flex flex-col gap-3">
      <input type="hidden" name="eventId" value={eventId} />

      {/* Honeypot anti-bot — hidden from humans */}
      <div
        aria-hidden
        className="absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0"
      >
        <label>
          Website
          <input type="text" name="_hp" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <label className="block">
        <span className="label">Avise-me sobre vagas e próximas noites</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          spellCheck={false}
          className="field"
        />
      </label>

      {error ? (
        <p
          role="alert"
          className="flash-error rounded-[var(--radius-sm)] px-3 py-2 text-sm"
        >
          {error}
        </p>
      ) : null}

      <SubmitButton
        pendingLabel="Enviando…"
        className="btn btn-secondary w-full"
      >
        Quero ser avisado(a)
      </SubmitButton>
    </form>
  );
}
