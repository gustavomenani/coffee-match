import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/seo";

/**
 * Only indexable public URLs (no login/admin/private flows).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { path: "/", changeFrequency: "daily", priority: 1 },
    { path: "/eventos", changeFrequency: "daily", priority: 0.95 },
    { path: "/termos", changeFrequency: "yearly", priority: 0.3 },
    { path: "/privacidade", changeFrequency: "yearly", priority: 0.3 },
    { path: "/regras", changeFrequency: "monthly", priority: 0.5 },
    { path: "/reembolso", changeFrequency: "monthly", priority: 0.4 },
  ].map(({ path, changeFrequency, priority }) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency: changeFrequency as MetadataRoute.Sitemap[0]["changeFrequency"],
    priority,
  }));

  try {
    const events = await prisma.event.findMany({
      where: { status: { in: ["published", "sold_out", "live"] } },
      select: { slug: true, updatedAt: true, startsAt: true },
      orderBy: { startsAt: "asc" },
      take: 500,
    });

    const eventRoutes: MetadataRoute.Sitemap = events.map((e) => ({
      url: absoluteUrl(`/eventos/${e.slug}`),
      lastModified: e.updatedAt,
      changeFrequency: "weekly",
      // Nearer events rank higher in our own priority signal
      priority: e.startsAt.getTime() > Date.now() ? 0.9 : 0.6,
    }));

    return [...staticRoutes, ...eventRoutes];
  } catch {
    return staticRoutes;
  }
}
