import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fleai — Flea Market Hunting & Shop",
    short_name: "Fleai",
    description: "Analizza oggetti second hand da 1–3 foto, confronta fonti citate e prepara annunci trasparenti.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f4f0e7",
    theme_color: "#17352f",
    lang: "it",
    categories: ["shopping", "business", "utilities"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
