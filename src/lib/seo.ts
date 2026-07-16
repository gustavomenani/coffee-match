import { appBaseUrl } from "@/lib/env";

export const SITE = {
  name: "Coffee Match",
  legalName: "Coffee Match",
  tagline: "Conectando pessoas, uma xícara por vez",
  description:
    "Coffee Match organiza noites presenciais de speed dating no Brasil. Rodadas reais, votação no celular e matches mútuos com WhatsApp. Ambiente 18+, seguro e sem scroll infinito.",
  locale: "pt_BR",
  language: "pt-BR",
  keywords: [
    "Coffee Match",
    "speed dating",
    "speed dating Brasil",
    "encontros presenciais",
    "eventos para solteiros",
    "match mútuo",
    "namoro offline",
    "eventos São Paulo",
    "encontrar alguém",
    "speed dating SP",
  ],
} as const;

export function absoluteUrl(path = ""): string {
  const base = appBaseUrl();
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function orgId(): string {
  return absoluteUrl("/#organization");
}

export function websiteId(): string {
  return absoluteUrl("/#website");
}
