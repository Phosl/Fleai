import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const publicPaths = ["/", "/come-funziona", "/s/"];
  const privatePaths = ["/admin", "/api", "/app", "/auth", "/login"];

  return {
    rules: [
      {
        userAgent: "*",
        allow: publicPaths,
        disallow: ["/api", "/auth"],
      },
      { userAgent: "OAI-SearchBot", allow: publicPaths, disallow: privatePaths },
      { userAgent: "ChatGPT-User", allow: publicPaths, disallow: privatePaths },
      // Search visibility and model training are separate choices.
      { userAgent: "GPTBot", disallow: "/" },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: new URL(absoluteUrl("/")).origin,
  };
}
