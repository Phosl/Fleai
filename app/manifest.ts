import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fleai — Flea Market Hunting & Shop",
    short_name: "Fleai",
    description: "Analizza, valuta e rivendi i ritrovamenti del mercatino.",
    start_url: "/app",
    display: "standalone",
    background_color: "#f4f0e7",
    theme_color: "#17352f",
    lang: "it",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
