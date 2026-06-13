import type { MetadataRoute } from "next";

// Served at /manifest.webmanifest; Next also injects the <link rel="manifest">.
// theme/background match the app's cream canvas (oklch(0.963 0.018 83) ≈ #f9f2e6)
// so the browser chrome and PWA splash don't seam against the page.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "L Health",
    short_name: "L Health",
    description: "Track daily water, exercise, body stats, and goals.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f9f2e6",
    theme_color: "#f9f2e6",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
