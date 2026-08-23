"use client";

import { useEffect, useRef, useState } from "react";
import type { IPureNode } from "markmap-common";
import type { Markmap } from "markmap-view";
import { pillarColor } from "@/components/ui/PillarChip";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Stamps a pillar index onto a branch and every one of its descendants via
 * `payload` (IPureNode's own generic per-node data bag), so the `color`
 * callback below can read it back.
 *
 * NOT done by keying off `node.state.path`/`state.id`: markmap-view's
 * internal `_initializeData` walk (dist/index.js) reassigns `state.id` as a
 * tree-wide auto-increment counter, not a per-sibling index, so a top-level
 * branch's position can't be recovered by parsing it. It also clones every
 * node via `{ ...node }` during that walk rather than mutating in place, so
 * a WeakMap keyed by node identity built before Markmap.create() wouldn't
 * match the objects the `color` callback later receives either. `payload`
 * is the one thing confirmed to survive that shallow clone (the spread
 * copies the same payload object reference), which is exactly why it
 * exists as an extension point.
 */
function stampPillar(node: IPureNode, pillarIndex: number | null): void {
  node.payload = { ...node.payload, pillarIndex };
  for (const child of node.children) stampPillar(child, pillarIndex);
}

/**
 * Renders a per-paper mindmap (issue #312) over an already-built markdown
 * outline (lib/mindmap/exportOutline.ts) via Markmap -- markmap-lib/
 * markmap-view only touch the DOM, so this loads them the same
 * dynamic-import-in-a-browser-only-effect way PdfPane.tsx loads react-pdf,
 * rather than a top-level import that would try to run during SSR.
 */
export function MindmapView({
  markdown,
  pillarOrder,
}: {
  markdown: string;
  pillarOrder: (number | null)[];
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!markdown) return;
    let cancelled = false;
    let markmap: Markmap | undefined;

    void (async () => {
      try {
        const [{ Transformer }, { Markmap: MarkmapCtor }] = await Promise.all([
          import("markmap-lib"),
          import("markmap-view"),
        ]);
        if (cancelled || !svgRef.current) return;

        const { root } = new Transformer().transform(markdown);
        root.children.forEach((branch, i) => stampPillar(branch, pillarOrder[i] ?? null));

        markmap = MarkmapCtor.create(
          svgRef.current,
          {
            duration: 300,
            // Same pillar hues GraphCanvas uses for the same node, keyed off
            // the payload stampPillar attached above, not path/id parsing.
            color: (node) => pillarColor((node.payload?.pillarIndex as number | null | undefined) ?? null),
          },
          root,
        );
      } catch (err) {
        if (!cancelled) {
          console.error("[MindmapView] Markmap failed to render:", err);
          setFailed(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      markmap?.destroy();
    };
  }, [markdown, pillarOrder]);

  if (failed) {
    return (
      <p className="p-s-5 font-sans text-sm text-ink-faint">
        The mindmap couldn&rsquo;t render. Try reloading, or read the outline instead.
      </p>
    );
  }

  return (
    <div className="relative h-full min-h-[32rem] w-full">
      <svg ref={svgRef} className="h-full w-full" role="img" aria-label="Mindmap of this paper's claim graph" />
      {!markdown && <Skeleton className="absolute inset-0" />}
    </div>
  );
}
