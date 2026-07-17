"use client";

import { useActionState, useState } from "react";
import { PhotoField } from "@/components/profile/photo-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateProfileWithState } from "@/components/profile/profile-actions";
import {
  INTERESTS,
  MAX_INTERESTS,
  sanitizeInterests,
} from "@/lib/domain/interests";

type ProfileFormProps = {
  defaults: {
    name: string;
    phone: string;
    instagram: string | null;
    bio: string | null;
    photoUrl: string | null;
    interests?: string[];
  };
};

export function ProfileForm({ defaults }: ProfileFormProps) {
  const [state, formAction] = useActionState(updateProfileWithState, null);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(() =>
    sanitizeInterests(defaults.interests ?? [])
  );
  const limitReached = selectedInterests.length >= MAX_INTERESTS;

  function toggleInterest(tag: string, checked: boolean) {
    setSelectedInterests((prev) => {
      if (checked) {
        if (prev.includes(tag) || prev.length >= MAX_INTERESTS) return prev;
        return [...prev, tag];
      }
      return prev.filter((t) => t !== tag);
    });
  }

  return (
    <>
      {state?.error ? (
        <p
          role="alert"
          className="flash-error mb-5 rounded-[var(--radius-sm)] px-4 py-3 text-sm leading-relaxed"
        >
          {state.error}
        </p>
      ) : null}

      {state?.success ? (
        <p
          role="status"
          className="flash-success mb-5 rounded-[var(--radius-sm)] px-4 py-3 text-sm leading-relaxed"
        >
          Perfil atualizado com sucesso.
        </p>
      ) : null}

      <form action={formAction} className="flex flex-col gap-5">
        <label className="block">
          <span className="label">Nome</span>
          <input
            type="text"
            name="name"
            required
            minLength={2}
            maxLength={100}
            defaultValue={defaults.name}
            className="field"
          />
        </label>

        <label className="block">
          <span className="label">Telefone</span>
          <input
            type="tel"
            name="phone"
            required
            minLength={10}
            maxLength={20}
            inputMode="tel"
            placeholder="(11) 99999-9999"
            defaultValue={defaults.phone}
            className="field"
          />
        </label>

        <label className="block">
          <span className="label">Instagram</span>
          <input
            type="text"
            name="instagram"
            maxLength={100}
            defaultValue={defaults.instagram ?? ""}
            placeholder="@seuusuario"
            className="field"
          />
        </label>

        <label className="block">
          <span className="label">Bio da noite (aparece na votação)</span>
          <textarea
            name="bio"
            maxLength={160}
            rows={3}
            defaultValue={defaults.bio ?? ""}
            placeholder="Ex.: Viciada em café coado e boas conversas."
            className="field"
          />
          <span className="mt-1.5 block text-xs text-[var(--muted)]">
            Até 160 caracteres — é o seu cartão de visita na cédula.
          </span>
        </label>

        <fieldset>
          <legend className="label">Interesses (até {MAX_INTERESTS})</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {INTERESTS.map((tag) => {
              const checked = selectedInterests.includes(tag);
              const disabled = !checked && limitReached;
              return (
                <label key={tag} className={disabled ? "cursor-not-allowed" : "cursor-pointer"}>
                  <input
                    type="checkbox"
                    name="interests"
                    value={tag}
                    checked={checked}
                    disabled={disabled}
                    onChange={(e) => toggleInterest(tag, e.target.checked)}
                    className="peer sr-only"
                  />
                  <span
                    className={`badge !normal-case !tracking-normal transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--carmine-hot)] ${
                      checked ? "badge-18" : "badge-soft"
                    } ${disabled ? "opacity-40" : ""}`}
                  >
                    {tag}
                  </span>
                </label>
              );
            })}
          </div>
          <span
            className={`mt-2 block text-xs ${
              limitReached
                ? "font-medium text-[var(--ink-soft)]"
                : "text-[var(--muted)]"
            }`}
            aria-live="polite"
          >
            {selectedInterests.length} de {MAX_INTERESTS} selecionados
          </span>
        </fieldset>

        <PhotoField defaultValue={defaults.photoUrl} />

        <SubmitButton pendingLabel="Salvando…">Salvar</SubmitButton>
      </form>
    </>
  );
}
