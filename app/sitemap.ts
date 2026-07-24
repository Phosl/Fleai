import type { MetadataRoute } from "next";
import { getPublicSitemapEntries } from "@/lib/data/public-shop";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const shops = await getPublicSitemapEntries();
  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/come-funziona"), changeFrequency: "monthly", priority: 0.8 },
  ];

  const shopPages: MetadataRoute.Sitemap = shops.flatMap((shop) => [
    {
      url: absoluteUrl(`/s/${shop.slug}`),
      lastModified: shop.updatedAt ? new Date(shop.updatedAt) : undefined,
      changeFrequency: "daily" as const,
      priority: 0.8,
    },
    ...shop.items.map((item) => ({
      url: absoluteUrl(`/s/${shop.slug}/${item.slug}`),
      lastModified: item.updatedAt ? new Date(item.updatedAt) : undefined,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ]);

  return [...staticPages, ...shopPages];
}
