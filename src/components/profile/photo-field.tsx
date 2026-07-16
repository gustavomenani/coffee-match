"use client";

import { useState } from "react";

const MAX_BYTES = 400 * 1024;

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
      setError("Imagem muito grande. Use no máximo 400KB.");
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
        setError("Imagem muito grande. Use no máximo 400KB.");
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
    <div className="flex flex-col gap-2 text-sm">
      <span className="font-medium text-zinc-800">Foto de perfil</span>

      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="Prévia da foto"
          className="h-24 w-24 rounded-full object-cover ring-1 ring-zinc-200"
        />
      ) : (
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-zinc-100 text-xs text-zinc-500 ring-1 ring-zinc-200">
          Sem foto
        </div>
      )}

      <input
        type="file"
        accept="image/*"
        onChange={onFileChange}
        className="block w-full text-sm text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-800"
      />

      <input type="hidden" name="photoUrl" value={photoUrl} />

      {photoUrl ? (
        <button
          type="button"
          onClick={clearPhoto}
          className="self-start text-xs text-zinc-600 underline hover:text-zinc-900"
        >
          Remover foto
        </button>
      ) : null}

      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : (
        <p className="text-xs text-zinc-500">Máximo 400KB. JPEG, PNG ou WebP.</p>
      )}
    </div>
  );
}
