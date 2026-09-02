"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

/**
 * Scroll-reveal wrapper: fades and lifts its children in once, the first
 * time they cross into the viewport. Fires once (observer disconnects after
 * the first intersection) -- content doesn't re-hide on scroll-away.
 *
 * The transition duration comes from the `duration-slow` Tailwind class, not
 * a hardcoded JS `ms` value, so the global `prefers-reduced-motion` rule in
 * app/globals.css (which forces `transition-duration` down to `--dur-fast`
 * via `!important`) still applies here without Reveal needing its own
 * reduced-motion branch.
 */
/** "lift" (default) fades and lifts up 12px. "slide" fades in from the side --
 *  an occasional break from every section entering the same way (design
 *  issue: vary at least one section's entrance). */
type RevealVariant = "lift" | "slide";

/*
 * Travel distances halved 2026-09-03 (lift 12px -> 6px, slide 16px -> 8px) as
 * part of the "slow, soft, subtle" motion retune.
 *
 * These fire on scroll, on section after section, so they set the felt
 * character of the whole marketing site more than any single interaction
 * does. At 12/16px combined with the old expo-out curve, a section did not
 * arrive so much as get thrown into place. Halved, and with the quad-out and
 * longer --dur-slow in app/globals.css, the opacity now leads and the
 * transform is only a hint of direction.
 */
const HIDDEN: Record<RevealVariant, string> = {
  lift: "translate-y-1.5 opacity-0",
  slide: "translate-x-2 opacity-0",
};
const VISIBLE: Record<RevealVariant, string> = {
  lift: "translate-y-0 opacity-100",
  slide: "translate-x-0 opacity-100",
};

export function Reveal({
  children,
  className,
  variant = "lift",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: RevealVariant;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={clsx(
        // "slide" translates its hidden state past the inline edge before
        // the IntersectionObserver fires, which otherwise widens the page's
        // scrollWidth and shows a horizontal scrollbar on first paint --
        // the frame that matters most, since it disappears once the reveal
        // runs. Clipping here contains that overshoot without changing what
        // "slide" looks like once visible.
        "overflow-x-clip transition-all duration-slow ease-out",
        visible ? VISIBLE[variant] : HIDDEN[variant],
        className,
      )}
    >
      {children}
    </div>
  );
}
