export const INTERESTS = [
  "Café",
  "Vinho",
  "Gastronomia",
  "Trilhas",
  "Corrida",
  "Academia",
  "Cinema",
  "Séries",
  "Música ao vivo",
  "Dança",
  "Viagens",
  "Praia",
  "Livros",
  "Jogos",
  "Pets",
  "Fotografia",
] as const;

export const MAX_INTERESTS = 5;

const VALID = new Set<string>(INTERESTS);

/**
 * Accepts unknown input (e.g. formData.getAll), keeps only known tags,
 * removes duplicates and caps at MAX_INTERESTS.
 */
export function sanitizeInterests(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const result: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    if (!VALID.has(item)) continue;
    if (result.includes(item)) continue;
    result.push(item);
    if (result.length >= MAX_INTERESTS) break;
  }
  return result;
}
