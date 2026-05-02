import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AvyTS SherpAI Terrain Intelligence",
    short_name: "AvyTS",
    description: "TerraSatch avalanche terrain intelligence with SherpAI field intake, report digesting, and terrain guidance.",
    start_url: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone"],
    background_color: "#f8fafc",
    theme_color: "#133b63",
    orientation: "portrait-primary",
    categories: ["weather", "navigation", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
      },
      {
        src: "/icons/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
      },
      {
        src: "/icons/maskable-icon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    screenshots: [
      {
        src: "/brand/comparison-map.png",
        sizes: "1280x720",
        type: "image/png",
        form_factor: "wide",
        label: "AvyTS SherpAI terrain workspace",
      },
    ],
  };
}
