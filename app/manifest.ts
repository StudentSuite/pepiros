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
    // 2026-09-02, issue #340. Was #14120F, the dark theme's --surface.
    //
    // These two are what Android paints on the PWA splash and what mobile
    // browsers tint their own chrome with. Neither can follow the theme
    // toggle: the manifest is static, read once at install time, so this is
    // a choice about which surface represents the product, not a token
    // reference.
    //
    // The atmosphere ramp's ground stop is the better answer than either
    // theme's --surface. The splash is the one moment the product is a brand
    // rather than a reading surface, and it is the same near-black the hero
    // band opens on, so install-then-launch is continuous instead of
    // stepping through a different dark. Kept in sync by hand with
    // MESH_DRIFT_PALETTE_HEX[0] in components/chrome/mesh-drift.frag.ts;
    // there is no import path from a metadata route to a client shader
    // module worth opening for one hex.
    background_color: "#050308",
    theme_color: "#050308",
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
