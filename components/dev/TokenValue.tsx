"use client";

import { useEffect, useState } from "react";

/**
 * Prints the COMPUTED value of a CSS custom property.
 *
 * Client-side and after paint, because that is the only place a resolved
 * value exists: on the server there is no cascade to read, and what a token
 * resolves to depends on which theme class next-themes has put on <html>.
 *
 * This is what stops /dev/tokens drifting from app/globals.css. The page
 * renders every swatch with a `bg-*` utility and then reads the hex back out
 * of the live property rather than repeating it as a string, so a swatch and
 * its label cannot disagree.
 *
 * The MutationObserver is not optional: next-themes swaps a class on <html>
 * rather than remounting anything, so without it every value on the page goes
 * stale the moment the theme toggle is used.
 */
export function TokenValue({ token }: { token: string }) {
  const [value, setValue] = useState<string>("");

  useEffect(() => {
    const root = document.documentElement;
    const read = () => setValue(getComputedStyle(root).getPropertyValue(token).trim() || "unset");
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["class", "style"] });
    return () => observer.disconnect();
  }, [token]);

  return (
    // Non-breaking space before hydration so the row does not change height
    // when the real value lands.
    <span className="font-mono text-2xs text-ink-faint" suppressHydrationWarning>
      {value || "\u00a0"}
    </span>
  );
}
