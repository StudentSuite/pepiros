import { cn } from "@/lib/utils";

/**
 * Code-composed mockups of the app's surfaces.
 *
 * Built from the real design tokens rather than captured as screenshots, so
 * they follow the theme, stay sharp at any density, cost no image bytes, and
 * never go stale against a palette change. They are illustrations of the
 * product, and they are drawn to match what the product actually renders.
 */

function Chrome({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-surface-raised shadow-e-2",
        className,
      )}
    >
      <div className="flex items-center gap-s-2 border-b border-border px-s-3 py-s-2">
        <span className="size-2 rounded-full bg-pillar-5/50" />
        <span className="size-2 rounded-full bg-pillar-6/50" />
        <span className="size-2 rounded-full bg-pillar-3/50" />
        <span className="ml-s-2 font-mono text-[10px] text-ink-faint">{label}</span>
      </div>
      {children}
    </div>
  );
}

/** Ruled lines standing in for body text, at a believable measure. */
function TextLines({ n = 6, className }: { n?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {Array.from({ length: n }).map((_, i) => (
        <div
          key={i}
          className="h-1.5 rounded-full bg-[#1c1a15]/12"
          style={{ width: `${[100, 96, 99, 92, 97, 88, 94, 90][i % 8]}%` }}
        />
      ))}
    </div>
  );
}

/**
 * The core moment: a claim on the left, the sentence it came from highlighted
 * in the source on the right.
 */
export function ReaderMock({ className }: { className?: string }) {
  return (
    <Chrome label="reader" className={className}>
      <div className="grid gap-px bg-border sm:grid-cols-[1.05fr_1fr]">
        {/* Source pane: always opaque paper, in both themes */}
        <div className="bg-[#f5f1e8] p-s-4">
          <p className="font-mono text-[9px] uppercase tracking-widest text-[#1c1a15]/45">
            Okafor &amp; Lindqvist, 2022 &middot; p.4
          </p>
          <div className="mt-s-3">
            <TextLines n={3} />
          </div>

          {/* The located quote */}
          <div className="my-s-3 rounded-sm bg-pillar-7/25 p-1.5 ring-1 ring-pillar-7/40">
            <div className="flex flex-col gap-1.5">
              <div className="h-1.5 w-[97%] rounded-full bg-[#1c1a15]/30" />
              <div className="h-1.5 w-[72%] rounded-full bg-[#1c1a15]/30" />
            </div>
          </div>

          <TextLines n={4} />
        </div>

        {/* Claim pane */}
        <div className="bg-surface-raised p-s-4">
          <p className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">
            Key finding
          </p>

          <div className="mt-s-3 flex flex-col gap-1.5">
            <div className="h-1.5 w-[94%] rounded-full bg-ink/25" />
            <div className="h-1.5 w-[88%] rounded-full bg-ink/25" />
            <div className="h-1.5 w-[52%] rounded-full bg-ink/25" />
          </div>

          <div className="mt-s-4 flex items-center gap-s-2">
            <span className="flex items-center gap-1 rounded-full border border-pillar-7/40 px-2 py-0.5 font-mono text-[9px] text-pillar-text-7">
              <span className="size-1 rounded-full bg-pillar-7" />
              quote located
            </span>
            <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] text-ink-faint">
              C7
            </span>
            <span className="font-mono text-[9px] text-ink-faint">0.97</span>
          </div>

          <div className="mt-s-4 border-t border-border pt-s-3">
            <div className="flex flex-col gap-1.5">
              <div className="h-1.5 w-[90%] rounded-full bg-ink/12" />
              <div className="h-1.5 w-[64%] rounded-full bg-ink/12" />
            </div>
            <div className="mt-s-3 flex items-center gap-s-2">
              <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[9px] text-ink-faint">
                inference
              </span>
              <span className="font-mono text-[9px] text-ink-faint">no source excerpt</span>
            </div>
          </div>
        </div>
      </div>
    </Chrome>
  );
}

/** The pillar fan-out: one paper becomes a small graph. */
export function GraphMock({ className }: { className?: string }) {
  const pillars = [
    { label: "Methods", tone: "bg-pillar-3" },
    { label: "Results", tone: "bg-pillar-4" },
    { label: "Limitations", tone: "bg-pillar-5" },
    { label: "Applications", tone: "bg-pillar-7" },
  ];

  return (
    <Chrome label="canvas" className={className}>
      <div className="relative bg-surface-sunken/60 p-s-5">
        <div className="mx-auto w-fit rounded-md border border-border bg-surface-raised px-s-3 py-s-2 text-center">
          <p className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">
            Paper
          </p>
          <div className="mx-auto mt-1 h-1 w-16 rounded-full bg-ink/25" />
        </div>

        {/* connectors */}
        <svg
          className="mx-auto mt-1 h-6 w-full max-w-sm"
          viewBox="0 0 320 24"
          fill="none"
          aria-hidden
        >
          {[40, 120, 200, 280].map((x) => (
            <path
              key={x}
              d={`M160 0 C160 12, ${x} 12, ${x} 24`}
              stroke="var(--border-strong)"
              strokeWidth="1"
            />
          ))}
        </svg>

        <div className="grid grid-cols-2 gap-s-2 sm:grid-cols-4">
          {pillars.map((p) => (
            <div
              key={p.label}
              className="rounded-md border border-border bg-surface-raised p-s-2"
            >
              <span className="flex items-center gap-1 font-mono text-[9px] text-ink-muted">
                <span className={cn("size-1.5 rounded-full", p.tone)} />
                {p.label}
              </span>
              <div className="mt-s-2 flex flex-col gap-1">
                <div className="h-1 w-full rounded-full bg-ink/15" />
                <div className="h-1 w-3/4 rounded-full bg-ink/15" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Chrome>
  );
}

/** An agent calling verify_claim on its own output, and getting told no. */
export function AgentMock({ className }: { className?: string }) {
  return (
    <Chrome label="agent" className={className}>
      <div className="flex flex-col gap-s-3 p-s-4">
        <div className="max-w-[85%] rounded-lg rounded-tl-sm border border-border bg-surface p-s-3">
          <p className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">
            Agent
          </p>
          <p className="mt-1.5 font-sans text-xs leading-relaxed text-ink-muted">
            This effect eliminates the need for melatonin supplementation
            entirely.
          </p>
        </div>

        <div className="flex items-center gap-s-2 self-center">
          <span className="rounded border border-accent/40 bg-accent-wash px-2 py-0.5 font-mono text-[9px] text-accent-text">
            verify_claim
          </span>
          <span className="font-mono text-[9px] text-ink-faint">
            checks it against C7
          </span>
        </div>

        <div className="max-w-[85%] self-end rounded-lg rounded-tr-sm border border-pillar-5/40 bg-pillar-5/10 p-s-3">
          <span className="rounded-full border border-pillar-5/50 px-2 py-0.5 font-mono text-[9px] text-pillar-text-5">
            unsupported
          </span>
          <p className="mt-1.5 font-sans text-xs leading-relaxed text-ink-muted">
            The source does not say this. The agent says so out loud, mid-answer.
          </p>
        </div>
      </div>
    </Chrome>
  );
}
