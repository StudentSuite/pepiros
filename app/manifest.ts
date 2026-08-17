import type { MetadataRoute } from "next";

// No manifest existed at all -- install/share/"add to home screen" surfaces
// read their icon from this file, not from the <link rel="icon"> tags
// app/icon.png etc already produce, so those surfaces were falling back to
// the browser's own generic placeholder glyph (review finding, 2026-08-13).
// Colors are --surface / --surface-sunken from app/globals.css, not new
// values.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pepiros",
    short_name: "Pepiros",
    description:
      "A publishing platform for researchers, with a summariser you can check: publish the papers you read, and every claim stays bound to the sentence it came from.",
    start_url: "/",
    display: "standalone",
    background_color: "#0d0e11",
    theme_color: "#14161a",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
