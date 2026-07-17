"use client";

import { useActionState } from "react";
import { PhotoField } from "@/components/profile/photo-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateProfileWithState } from "@/components/profile/profile-actions";

type ProfileFormProps = {
  defaults: {
    name: string;
    phone: string;
    instagram: string | null;
    bio: string | null;
    photoUrl: string | null;
  };
};

export function ProfileForm({ defaults }: ProfileFormProps) {
  const [state, formAction] = useActionState(updateProfileWithState, null);

  return (
    <>
      {state?.error ? (
        <p
          role="alert"
          className="flash-error mb-5 rounded-[var(--radius-sm)] px-3 py-2 text-sm"
        >
          {state.error}
        </p>
      ) : null}

      {state?.success ? (
        <p
          role="status"
          className="flash-success mb-5 rounded-[var(--radius-sm)] px-3 py-2 text-sm"
        >
          Perfil atualizado com sucesso.
        </p>
      ) : null}

      <form action={formAction} className="flex flex-col gap-4">
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
          <span className="mt-1 block text-xs text-[var(--muted)]">
            Até 160 caracteres — é o seu cartão de visita na cédula.
          </span>
        </label>

        <PhotoField defaultValue={defaults.photoUrl} />

        <SubmitButton pendingLabel="Salvando…">Salvar</SubmitButton>
      </form>
    </>
  );
}
