import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Coffee Match",
    short_name: "CoffeeMatch",
    description: SITE.description,
    start_url: "/",
    display: "standalone",
    background_color: "#1a100c",
    theme_color: "#faf6f1",
    lang: "pt-BR",
    categories: ["lifestyle", "social"],
    // O PNG tem ~15% de margem de segurança em volta do logo, então o mesmo
    // arquivo serve para "any" e "maskable" (o tipo do Next não aceita o
    // purpose combinado "any maskable").
    icons: [
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
