import Link from "next/link";
import { MessageCircle, Heart } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { PillarChip, pillarColor } from "@/components/ui/PillarChip";
import { topicLabelForPillar, formatMockDate, type MockPaper } from "@/lib/mock/discover";

/**
 * Card for one paper in a grid. Built page-local to `/discover` in Task 6
 * (that task's own comment flagged the promotion as "a later task's call").
 * Task 7 reuses this exact look on `/u/[username]`'s published-papers grid,
 * so it's promoted here rather than duplicated -- same markup, same props,
 * just moved so both pages import one definition.
 */
export function PaperCard({ paper }: { paper: MockPaper }) {
  // Same color-mix tint components/canvas/PillarNode.tsx uses on graph nodes
  // -- a card's pillar hue was previously legible only as a 2-6px chip dot.
  const tint = pillarColor(paper.pillarIndex);

  return (
    <Link
      href={`/paper/${paper.slug}`}
      className="group flex flex-col gap-s-3 rounded-lg border border-border p-s-4 shadow-e-1 transition duration-base ease-out hover:border-accent hover:shadow-e-2"
      style={{ backgroundColor: `color-mix(in srgb, ${tint} 6%, var(--surface-raised))` }}
    >
      <div className="flex items-start justify-between gap-2">
        <PillarChip pillarIndex={paper.pillarIndex} label={topicLabelForPillar(paper.pillarIndex)} />
        {paper.openAccess ? (
          <Badge dotClassName="bg-accent" className="shrink-0 text-ink-muted">
            Open access
          </Badge>
        ) : (
          <Badge className="shrink-0 border-dashed text-ink-faint">Author-published</Badge>
        )}
      </div>

      <h3 className="font-serif text-base leading-snug text-ink transition-colors duration-fast ease-out group-hover:text-accent">
        {paper.title}
      </h3>

      <p className="font-mono text-xs text-ink-faint">
        {paper.authors.join(", ")}
        {paper.venue ? ` · ${paper.venue}` : ""} · {formatMockDate(paper.publishedDate)}
      </p>

      <div className="mt-auto flex items-center gap-4 pt-2 font-mono text-xs text-ink-faint">
        <span className="flex items-center gap-1">
          <Icon icon={MessageCircle} size="xs" /> {paper.discussionCount}
        </span>
        <span className="flex items-center gap-1">
          <Icon icon={Heart} size="xs" /> {paper.likeCount}
        </span>
      </div>
    </Link>
  );
}
