import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  poweredByHeader: false,
  async headers() {
    const noIndexHeader = {
      key: "X-Robots-Tag",
      value: "noindex, nofollow, noarchive",
    };

    return [
      { source: "/api/:path*", headers: [noIndexHeader] },
      { source: "/auth/:path*", headers: [noIndexHeader] },
      { source: "/app/:path*", headers: [noIndexHeader] },
      { source: "/admin/:path*", headers: [noIndexHeader] },
      { source: "/login", headers: [noIndexHeader] },
    ];
  },
};

export default nextConfig;
