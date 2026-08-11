"use client";

import { useEffect, useState } from "react";

/**
 * For the JS-driven motion CSS can't cover on its own (e.g. disabling the
 * dash-march above 4 visible contradiction edges, or skipping the chat ->
 * canvas ghost-card fly in Stage C3). Pure-CSS animations already respect
 * `prefers-reduced-motion` globally via app/globals.css.
 */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
