import { buildClaimSummaries } from "@/lib/reader/claims";
import { stripRefMarkers } from "@/components/canvas/InlineRefs";
import { EvidenceBadge } from "@/components/ui/EvidenceBadge";
import { RefChip } from "@/components/ui/RefChip";
import { ArticleBody } from "@/components/reading/Article";
import type { Chunk, Evidence, GraphNode, Workspace } from "@/types/anchor";

/**
 * A catalog paper's write-up, read from the real graph (issue #283).
 *
 * This replaces lib/data/paperContent.ts's procedural generator, which
 * invented claims, quotes, page numbers and match scores from a hash of the
 * paper id and attached them to real, checkable papers (issue #253).
 *
 * The point is not just that the content is real. It is that this reads the
 * same nodes and evidence rows the reader reads, through the same
 * `buildClaimSummaries` the reader's own claim stack uses, so the public page
 * and the workspace can never disagree about a paper. Same argument that put
 * app/api/* and mcp/server.ts behind one service layer: two renderers deriving
 * the same claim independently is two renderers that will eventually
 * contradict each other, and a contradiction here is the product failing at
 * the one thing it promises.
 *
 * Nothing is generated at render time. If a claim has no located quote it
 * says so, exactly as the reader does.
 */

function EvidenceLine({ evidence, chunks }: { evidence: Evidence; chunks: Chunk[] }) {
  const chunk = evidence.anchor ? chunks.find((c) => c.id === evidence.anchor!.chunkId) : undefined;

  if (!evidence.anchor) {
    return (
      <div className="mt-s-3 border-l-2 border-border pl-s-4">
        <p className="font-sans text-sm leading-relaxed text-ink-faint">
          The verifier could not locate a sentence supporting this claim, so its
          citation was stripped rather than left dangling.
        </p>
      </div>
    );
  }

  return (
    <figure className="mt-s-3 border-l-2 border-border-strong pl-s-4">
      {/* One step down from the claim's own text-base and on text-ink-muted
          rather than text-ink -- subordinate to the claim, per issue #300,
          not the same visual weight as the thing it's supporting. Still
          never hidden: full quote, not truncated. */}
      <blockquote className="font-serif text-sm italic leading-relaxed text-ink-muted">
        &ldquo;{evidence.anchor.quote}&rdquo;
      </blockquote>
      <figcaption className="mt-s-2 flex flex-wrap items-center gap-2 font-mono text-2xs text-ink-faint">
        <RefChip refId={evidence.refId} />
        {chunk && <span>p.{chunk.page}</span>}
        {/* The score is the real token_set_ratio the matcher produced, not a
            number chosen to look convincing. */}
        <span>{evidence.matchScore.toFixed(2)}</span>
        {evidence.numericOk === false && (
          <span className="text-unsupported">a figure in the claim disagrees</span>
        )}
      </figcaption>
    </figure>
  );
}

function Claim({
  node,
  evidence,
  chunks,
}: {
  node: GraphNode;
  evidence: Evidence[];
  chunks: Chunk[];
}) {
  const [summary] = buildClaimSummaries([node], evidence, chunks);
  const tier = summary?.weakestTier ?? null;

  return (
    <section className="mt-s-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-sans font-semibold text-[1.15rem] leading-snug text-ink">{node.title}</h3>
        {tier && <EvidenceBadge tier={tier} />}
      </div>

      {/* Markers stripped from the prose and surfaced as the evidence block
          below, so the claim reads as prose and its sources sit beside it
          rather than mid-sentence. font-serif: this is reading prose, not
          UI chrome (issue #300's font-role rule, same as ArticleBody). */}
      <p className="mt-s-2 font-serif text-base leading-relaxed text-ink-muted">
        {stripRefMarkers(node.bodyMd)}
      </p>

      {summary?.weakestEvidence && (
        <EvidenceLine evidence={summary.weakestEvidence} chunks={chunks} />
      )}
    </section>
  );
}

export function GroundedArticle({ workspace }: { workspace: Workspace }) {
  const pillars = workspace.nodes.filter((n) => n.type === "pillar");
  const leaves = workspace.nodes.filter((n) => n.type === "leaf");

  // `contains` edges are the real parent link. pillarIndex is a colour, not a
  // hierarchy, so grouping by it would silently merge two pillars that happen
  // to share a hue.
  const leafIdsByPillar = new Map<string, string[]>();
  for (const edge of workspace.edges) {
    if (edge.kind !== "contains") continue;
    const list = leafIdsByPillar.get(edge.sourceId) ?? [];
    list.push(edge.targetId);
    leafIdsByPillar.set(edge.sourceId, list);
  }

  const leafById = new Map(leaves.map((n) => [n.id, n]));
  const claimed = new Set<string>();
  const sections = pillars.map((pillar) => {
    const children = (leafIdsByPillar.get(pillar.id) ?? [])
      .map((id) => leafById.get(id))
      .filter((n): n is GraphNode => Boolean(n));
    for (const child of children) claimed.add(child.id);
    return { pillar, children };
  });

  // A leaf with no `contains` edge is still real output and still cited. It
  // gets its own section rather than being dropped, because silently hiding a
  // verified claim is a worse failure than an untidy heading.
  const orphans = leaves.filter((n) => !claimed.has(n.id));

  if (sections.length === 0 && orphans.length === 0) {
    return (
      <ArticleBody className="mt-s-6">
        <p>
          This paper has been indexed but produced no claims, which usually means
          the generators could not anchor anything to its text. Nothing is shown
          rather than something invented.
        </p>
      </ArticleBody>
    );
  }

  return (
    <div className="mt-s-6">
      {sections.map(({ pillar, children }) => (
        <section key={pillar.id} className="mt-s-7">
          <h2 className="font-sans font-semibold text-[1.45rem] leading-snug text-ink">{pillar.title}</h2>
          {pillar.bodyMd.trim() !== "" && (
            <p className="mt-s-2 font-serif text-base leading-relaxed text-ink-faint">
              {stripRefMarkers(pillar.bodyMd)}
            </p>
          )}
          {children.map((leaf) => (
            <Claim
              key={leaf.id}
              node={leaf}
              evidence={workspace.evidence}
              chunks={workspace.chunks}
            />
          ))}
        </section>
      ))}

      {orphans.length > 0 && (
        <section className="mt-s-7">
          <h2 className="font-sans font-semibold text-[1.45rem] leading-snug text-ink">Other claims</h2>
          {orphans.map((leaf) => (
            <Claim
              key={leaf.id}
              node={leaf}
              evidence={workspace.evidence}
              chunks={workspace.chunks}
            />
          ))}
        </section>
      )}
    </div>
  );
}
