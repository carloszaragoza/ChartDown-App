import type { MetadataRoute } from "next";

/**
 * The installable app (T-901): name, full-screen display and the logo icons, served by the app
 * itself so it installs on the iPad home screen. Colors are the Papel tokens.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ChartDown",
    short_name: "ChartDown",
    description: "Number charts for the whole band, with each player's notes.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fbfcfd",
    theme_color: "#16212c",
    icons: [
      { src: "/icons/app-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/app-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/app-icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
