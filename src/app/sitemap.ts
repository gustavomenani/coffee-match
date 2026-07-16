import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { appBaseUrl } from "@/lib/env";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = appBaseUrl();
  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/eventos",
    "/cadastro",
    "/login",
    "/termos",
    "/privacidade",
    "/regras",
    "/reembolso",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" || path === "/eventos" ? "daily" : "monthly",
    priority: path === "" ? 1 : path === "/eventos" ? 0.9 : 0.4,
  }));

  try {
    const events = await prisma.event.findMany({
      where: { status: { in: ["published", "sold_out", "live"] } },
      select: { slug: true, updatedAt: true },
      take: 200,
    });
    const eventRoutes = events.map((e) => ({
      url: `${base}/eventos/${e.slug}`,
      lastModified: e.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
    return [...staticRoutes, ...eventRoutes];
  } catch {
    return staticRoutes;
  }
}
