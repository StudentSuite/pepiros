const CARDS = [
  {
    title: "Grounded write-ups",
    body: "Every claim is generated from the paper, then matched back against its own source sentence -- not summarised on trust.",
  },
  {
    title: "Deterministic verification",
    body: "A string match scores each claim, the same way every time. No second model grades the first one's work.",
  },
  {
    title: "Tools for agents",
    body: "Connect over MCP and an agent can check its own claims before it answers, using the same verifier this page describes.",
  },
] as const;

/**
 * Issue #296: "one bento block for the capability grid, if and only if
 * three plain cards cannot carry it." Three cards do carry it here -- each
 * capability is a single sentence, and a bento layout (asymmetric spans,
 * a larger hero tile) would add visual complexity this content doesn't
 * need. Kept as three even cards rather than reaching for the more
 * elaborate pattern the issue explicitly makes conditional.
 */
export function CapabilityCards() {
  return (
    <div className="grid gap-s-4 sm:grid-cols-3">
      {CARDS.map((card) => (
        <div key={card.title} className="rounded-lg border border-border p-s-5">
          <h3 className="font-serif text-base text-ink">{card.title}</h3>
          <p className="mt-s-2 font-sans text-[13px] leading-relaxed text-ink-muted">{card.body}</p>
        </div>
      ))}
    </div>
  );
}
