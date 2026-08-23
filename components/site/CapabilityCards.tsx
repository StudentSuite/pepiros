import { FileSearch, ShieldCheck, UserCheck } from "lucide-react";

/**
 * Block 4 (plan §6.1): Cohere's "Safe. Flexible. Independent." slot. Copy is
 * the plan's own drafted triad, "Located. Traceable. Yours." -- Cohere's
 * cadence (short, declarative, possessive) inside the evidence vocabulary.
 *
 * REVISED 2026-08-23 (design/anti-slop.md). The first pass drew this as
 * three identical bordered cards, each with an icon inside a glowing ring --
 * exactly the "three-card feature grid" pattern that checklist calls out,
 * content-driven three-item count or not. Rendered instead as one flowing
 * row divided by hairlines rather than three separate boxes: same three
 * facts, no card chrome pretending each is an independent module. The icon
 * sits inline before its own heading rather than centred above it, which is
 * what stops the row reading as a stamped-out repeat of one component.
 */
const CARDS = [
  {
    title: "Located.",
    icon: FileSearch,
    tone: "amber",
    body: "Every claim is generated from the paper, then matched back against its own source sentence -- not summarised on trust.",
  },
  {
    title: "Traceable.",
    icon: ShieldCheck,
    tone: "green",
    body: "A deterministic string match scores each claim, the same way every time. No second model grades the first one's work.",
  },
  {
    title: "Yours.",
    icon: UserCheck,
    tone: "violet",
    body: "Connect over MCP and an agent can check its own claims before it answers, using the same verifier this page describes.",
  },
] as const;

export function CapabilityCards() {
  return (
    <div className="divide-y divide-border sm:grid sm:grid-cols-3 sm:divide-y-0 sm:divide-x">
      {CARDS.map((card) => (
        <div key={card.title} className="flex gap-s-3 py-s-4 first:pt-0 sm:px-s-5 sm:py-0 sm:first:pl-0 sm:last:pr-0">
          <card.icon
            className="mt-[3px] size-4 shrink-0"
            style={{ color: `var(--disp-${card.tone})` }}
            aria-hidden
          />
          <div>
            <h3 className="font-sans font-semibold text-base text-ink">{card.title}</h3>
            <p className="mt-1 font-sans text-[13px] leading-relaxed text-ink-muted">{card.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
