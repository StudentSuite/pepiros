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
export function Reveal({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
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
        "transition-all duration-slow ease-out",
        visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
