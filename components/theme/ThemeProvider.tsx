"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Theme root.
 *
 * `defaultTheme="dark"` is deliberate: the locked visual direction (plan.md
 * section 11) is "Editorial Paper, lab notebook at night", dark-first, and
 * first load should show that rather than the mode that was never
 * art-directed. `enableSystem` is on so a visitor whose OS is light is not
 * fought with, and the toggle exposes "System" as an explicit third state
 * rather than hiding it.
 *
 * `disableTransitionOnChange` injects `* { transition: none !important }` for
 * a single frame during the swap. Without it every colour on the page lerps at
 * once and the toggle feels like a slow wipe. It suppresses *transitions* only,
 * which is why the hero crossfade in app/globals.css is built on keyframe
 * animations instead -- those survive the freeze. See the HERO THEME CROSSFADE
 * block there.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
