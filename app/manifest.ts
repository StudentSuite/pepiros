import type { MetadataRoute } from "next";

// No manifest existed at all -- install/share/"add to home screen" surfaces
// read their icon from this file, not from the <link rel="icon"> tags
// app/icon.png etc already produce, so those surfaces were falling back to
// the browser's own generic placeholder glyph (review finding, 2026-08-13).
//
// 2026-08-23, brand kit swap. Two real bugs fixed here:
//
//   1. background_color/theme_color were #0d0e11 and #14161a, with a comment
//      claiming they were --surface / --surface-sunken. They were neither:
//      those values appear nowhere in app/globals.css and matched no token in
//      any theme. Both now use the kit's --surface (dark), #14120F.
//   2. The maskable icon was missing. Without one, Android crops the square
//      icon into its own mask and clips the glyph. The kit ships a
//      purpose-built maskable render with the safe-zone padding already
//      applied, so it is served here from public/brand/app-icons/.
//
// The android/maskable icons are served out of public/ rather than through
// Next's file convention, which only covers icon/apple-icon and has no notion
// of `purpose: maskable`.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pepiros",
    short_name: "Pepiros",
    description:
      "A publishing platform for researchers, with a summariser you can check: publish the papers you read, and every claim stays bound to the sentence it came from.",
    start_url: "/",
    display: "standalone",
    background_color: "#14120F",
    theme_color: "#14120F",
    icons: [
      { src: "/brand/app-icons/android-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/app-icons/android-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/brand/app-icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      { src: "/brand/app-icons/apple-touch-180.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
