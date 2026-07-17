"use client";

import { useRef, useState } from "react";

// sanitizePhotoInput (src/lib/security/photo.ts) aceita data URLs de até
// 120.000 caracteres; miramos abaixo disso com folga.
const MAX_DATA_URL_CHARS = 110_000;

// Tentativas de compressão em ordem: reduz qualidade e depois o tamanho
// até o data URL caber no limite.
const ATTEMPTS: ReadonlyArray<{ size: number; quality: number }> = [
  { size: 512, quality: 0.82 },
  { size: 512, quality: 0.7 },
  { size: 512, quality: 0.6 },
  { size: 384, quality: 0.7 },
  { size: 384, quality: 0.6 },
  { size: 320, quality: 0.55 },
];

type Props = {
  defaultValue?: string | null;
};

type Drawable = ImageBitmap | HTMLImageElement;

async function loadImage(file: File): Promise<Drawable> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // Alguns navegadores falham com certos formatos; cai no <img>.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Falha ao decodificar a imagem."));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function drawSquareJpeg(source: Drawable, size: number, quality: number): string {
  const width = source.width;
  const height = source.height;
  const side = Math.min(width, height);
  const sx = (width - side) / 2;
  const sy = (height - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível.");

  // JPEG não tem transparência: fundo branco evita áreas pretas em PNGs.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  // Crop central (cover) para quadrado.
  ctx.drawImage(source, sx, sy, side, side, 0, 0, size, size);

  return canvas.toDataURL("image/jpeg", quality);
}

async function fileToDataUrl(file: File): Promise<string> {
  const source = await loadImage(file);
  try {
    for (const { size, quality } of ATTEMPTS) {
      const dataUrl = drawSquareJpeg(source, size, quality);
      if (dataUrl.length <= MAX_DATA_URL_CHARS) return dataUrl;
    }
    throw new Error("Não foi possível comprimir a imagem o suficiente.");
  } finally {
    if ("close" in source) source.close();
  }
}

export function PhotoField({ defaultValue }: Props) {
  const [photoUrl, setPhotoUrl] = useState(defaultValue ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Selecione um arquivo de imagem.");
      input.value = "";
      return;
    }

    setBusy(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      setPhotoUrl(dataUrl);
    } catch {
      setError("Não foi possível ler a imagem. Tente outra foto.");
    } finally {
      setBusy(false);
      // Permite selecionar o mesmo arquivo novamente.
      input.value = "";
    }
  }

  function clearPhoto() {
    setPhotoUrl("");
    setError(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="label">Foto de perfil</span>

      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt="Prévia da foto"
          className="h-24 w-24 rounded-full object-cover ring-1 ring-[var(--line-strong)]"
        />
      ) : (
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--paper-deep)] text-xs text-[var(--muted)] ring-1 ring-[var(--line)]">
          Sem foto
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onFileChange}
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
      />

      <input type="hidden" name="photoUrl" value={photoUrl} />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          className="btn btn-secondary self-start"
        >
          {busy ? "Processando…" : photoUrl ? "Trocar foto" : "Escolher foto"}
        </button>

        {photoUrl ? (
          <button
            type="button"
            onClick={clearPhoto}
            className="text-xs font-medium text-[var(--muted)] underline-offset-2 transition-colors hover:text-[var(--carmine)] hover:underline"
          >
            Remover foto
          </button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-xs text-[var(--danger)]">
          {error}
        </p>
      ) : (
        <p className="text-xs text-[var(--muted)]">
          A foto é recortada e comprimida automaticamente no seu aparelho.
        </p>
      )}
    </div>
  );
}
