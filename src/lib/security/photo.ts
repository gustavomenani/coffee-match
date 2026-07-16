const MAX_DATA_URL_CHARS = 120_000; // ~90KB payload
const ALLOWED_DATA_PREFIXES = [
  "data:image/jpeg;base64,",
  "data:image/jpg;base64,",
  "data:image/png;base64,",
  "data:image/webp;base64,",
] as const;

/**
 * Accept https URLs or small base64 data URLs of safe image MIME types.
 */
export function sanitizePhotoInput(raw: string | undefined | null): {
  ok: true;
  value: string | null;
} | { ok: false; error: string } {
  if (raw == null || raw === "") return { ok: true, value: null };

  const v = raw.trim();
  if (v.startsWith("https://")) {
    if (v.length > 2048) return { ok: false, error: "URL de foto muito longa." };
    try {
      const u = new URL(v);
      if (u.protocol !== "https:") {
        return { ok: false, error: "Use apenas HTTPS para URL de foto." };
      }
      return { ok: true, value: v };
    } catch {
      return { ok: false, error: "URL de foto inválida." };
    }
  }

  // Block plain http
  if (v.startsWith("http://")) {
    return { ok: false, error: "HTTP inseguro não é permitido para foto." };
  }

  if (v.startsWith("data:image/")) {
    if (v.length > MAX_DATA_URL_CHARS) {
      return {
        ok: false,
        error: "Foto muito grande. Use imagem menor (máx. ~90KB).",
      };
    }
    const allowed = ALLOWED_DATA_PREFIXES.some((p) =>
      v.toLowerCase().startsWith(p)
    );
    if (!allowed) {
      return {
        ok: false,
        error: "Formato de imagem inválido. Use JPEG, PNG ou WebP.",
      };
    }
    return { ok: true, value: v };
  }

  return { ok: false, error: "URL de foto inválida." };
}
