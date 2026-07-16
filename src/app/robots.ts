import type { MetadataRoute } from "next";
import { appBaseUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const base = appBaseUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/eventos", "/eventos/", "/termos", "/privacidade", "/regras", "/reembolso"],
        disallow: [
          "/admin",
          "/admin/",
          "/api/",
          "/minha-conta",
          "/meus-ingressos",
          "/evento/",
          "/login",
          "/cadastro",
          "/pagamento/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
