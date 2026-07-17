import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

/**
 * Public crawl rules — private app areas stay out of the index.
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/eventos",
          "/eventos/",
          "/termos",
          "/privacidade",
          "/regras",
          "/reembolso",
          "/manifest.webmanifest",
          "/logo.jpeg",
        ],
        disallow: [
          "/admin",
          "/admin/",
          "/api/",
          "/minha-conta",
          "/minha-conta/",
          "/meus-ingressos",
          "/meus-ingressos/",
          // Renders names, phone numbers and WhatsApp links — kept out of the
          // index alongside its /meus-ingressos sibling (it was added later and
          // the crawl policy was never updated).
          "/meus-matches",
          "/meus-matches/",
          "/evento/",
          "/login",
          "/cadastro",
          "/pagamento/",
        ],
      },
      // Optional: be explicit for common AI crawlers (same public policy)
      {
        userAgent: "GPTBot",
        allow: ["/", "/eventos", "/termos", "/privacidade", "/regras", "/reembolso"],
        disallow: ["/admin", "/api/", "/minha-conta", "/meus-ingressos", "/meus-matches", "/evento/", "/login", "/cadastro", "/pagamento/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    // Bare host, not a URL: the robots `host` directive takes a hostname.
    host: new URL(absoluteUrl("/")).host,
  };
}
