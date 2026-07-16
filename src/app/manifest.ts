import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: "Coffee Match",
    description: SITE.description,
    start_url: "/",
    display: "standalone",
    background_color: "#faf6f1",
    theme_color: "#b87333",
    lang: "pt-BR",
    categories: ["lifestyle", "social"],
    icons: [
      {
        src: "/logo.jpeg",
        sizes: "512x512",
        type: "image/jpeg",
        purpose: "any",
      },
      {
        src: "/logo.jpeg",
        sizes: "192x192",
        type: "image/jpeg",
        purpose: "maskable",
      },
    ],
  };
}
