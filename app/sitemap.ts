import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return [
    { url: base, lastModified: new Date(), priority: 1 },
    { url: `${base}/s/officina-ritrovata`, lastModified: new Date(), priority: .8 },
  ];
}
