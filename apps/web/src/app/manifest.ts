import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name:             "Kwinna",
    short_name:       "Kwinna",
    description:      "Juntas llegamos más lejos. Descubrí tu outfit perfecto.",
    start_url:        "/shop",
    display:          "standalone",
    orientation:      "portrait",
    background_color: "#000000",
    theme_color:      "#000000",
    categories:       ["shopping", "lifestyle"],
    icons: [
      {
        src:     "/icons/icon-192.png",
        sizes:   "192x192",
        type:    "image/png",
        purpose: "any",
      },
      {
        src:     "/icons/icon-512.png",
        sizes:   "512x512",
        type:    "image/png",
        purpose: "any",
      },
      {
        src:     "/icons/icon-512.png",
        sizes:   "512x512",
        type:    "image/png",
        purpose: "maskable",
      },
    ],
  };
}
