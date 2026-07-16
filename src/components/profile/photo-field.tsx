"use client";

import { useState } from "react";

const MAX_BYTES = 90 * 1024;

type Props = {
  defaultValue?: string | null;
};

export function PhotoField({ defaultValue }: Props) {
  const [photoUrl, setPhotoUrl] = useState(defaultValue ?? "");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(defaultValue ?? "");

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Selecione um arquivo de imagem.");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_BYTES) {
      setError("Imagem muito grande. Use no máximo 90KB.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl.startsWith("data:image/")) {
        setError("Não foi possível ler a imagem.");
        return;
      }
      if (dataUrl.length > 600_000) {
        setError("Imagem muito grande. Use no máximo 90KB.");
        return;
      }
      setPhotoUrl(dataUrl);
      setPreview(dataUrl);
    };
    reader.onerror = () => {
      setError("Não foi possível ler a imagem.");
    };
    reader.readAsDataURL(file);
  }

  function clearPhoto() {
    setPhotoUrl("");
    setPreview("");
    setError(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="label">Foto de perfil</span>

      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="Prévia da foto"
          className="h-24 w-24 rounded-full object-cover ring-1 ring-[var(--line-strong)]"
        />
      ) : (
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--paper-deep)] text-xs text-[var(--muted)] ring-1 ring-[var(--line)]">
          Sem foto
        </div>
      )}

      <input
        type="file"
        accept="image/*"
        onChange={onFileChange}
        className="block w-full text-sm text-[var(--ink-soft)] file:mr-3 file:rounded-[var(--radius-pill)] file:border-0 file:bg-[linear-gradient(165deg,var(--carmine-hot),var(--carmine-deep))] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-[#fffaf8] hover:file:opacity-95"
      />

      <input type="hidden" name="photoUrl" value={photoUrl} />

      {photoUrl ? (
        <button
          type="button"
          onClick={clearPhoto}
          className="self-start text-xs font-medium text-[var(--muted)] underline-offset-2 transition-colors hover:text-[var(--carmine)] hover:underline"
        >
          Remover foto
        </button>
      ) : null}

      {error ? (
        <p className="text-xs text-[var(--danger)]">{error}</p>
      ) : (
        <p className="text-xs text-[var(--muted)]">
          Máximo 90KB. JPEG, PNG ou WebP.
        </p>
      )}
    </div>
  );
}
