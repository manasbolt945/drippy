import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Drippy",
    short_name: "Drippy",
    description: "Snap your outfit and get an AI score for every occasion.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#070B1A",
    theme_color: "#070B1A",
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
