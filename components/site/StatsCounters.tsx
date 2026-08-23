"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const COUNT_DURATION_MS = 900;

function useCountUp(target: number, active: boolean, reducedMotion: boolean): number {
  const [value, setValue] = useState(reducedMotion ? target : 0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    if (reducedMotion) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / COUNT_DURATION_MS);
      setValue(Math.round(t * target));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [active, reducedMotion, target]);

  return value;
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="font-mono text-3xl tabular-nums text-ink sm:text-4xl">{value}</span>
      <span className="max-w-[10rem] font-sans text-xs leading-snug text-ink-faint">{label}</span>
    </div>
  );
}

/**
 * Issue #296: "counters that count up on entry: papers indexed, claims
 * anchored, MCP tools live." All three are real numbers, not marketing
 * round-ups:
 *
 * - `papersInCatalog`: lib/data/papers.ts's CATALOG.length. Labelled "in the
 *   catalog," not "indexed" -- none of the 24 are indexed yet (issue #279 is
 *   still open), so claiming otherwise here would be exactly the kind of
 *   overclaiming this product argues against.
 * - `claimsAnchored`: a real count of anchored evidence rows in the ws-1
 *   demo workspace (fixtures/workspace.json), labelled as the demo
 *   workspace's own count rather than implied production-wide scale.
 * - `mcpToolsLive`: LIVE_TOOLS.length from lib/mcp/registry.ts.
 */
export function StatsCounters({
  papersInCatalog,
  claimsAnchored,
  mcpToolsLive,
}: {
  papersInCatalog: number;
  claimsAnchored: number;
  mcpToolsLive: number;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const [active, setActive] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reducedMotion) {
      setActive(true);
      return;
    }
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [reducedMotion]);

  const papers = useCountUp(papersInCatalog, active, reducedMotion);
  const claims = useCountUp(claimsAnchored, active, reducedMotion);
  const tools = useCountUp(mcpToolsLive, active, reducedMotion);

  return (
    <div ref={ref} className="flex flex-wrap justify-center gap-s-8">
      <Stat value={papers} label="Papers in the open-access catalog" />
      <Stat value={claims} label="Claims anchored in the demo workspace" />
      <Stat value={tools} label="MCP tools live" />
    </div>
  );
}
