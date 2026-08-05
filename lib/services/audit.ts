import { auditText, type SentenceAudit } from "@/lib/grounding/reverseAudit";
import { fetchWorkspace } from "./workspace";

/**
 * API-facing wrapper around the reverse audit, so app/api/audit/route.ts calls
 * lib/services/* like every other route rather than reaching into
 * lib/grounding/* directly (CLAUDE.md, "service-layer boundary"). The MCP
 * surface will call this same function.
 */

export interface AuditResult {
  sentences: SentenceAudit[];
  /** Share of sentences the corpus could not support. */
  dropRate: number;
}

export async function auditTextAgainstWorkspace(
  workspaceId: string,
  text: string,
): Promise<AuditResult> {
  const workspace = await fetchWorkspace(workspaceId);
  const sentences = auditText(text, workspace.chunks, workspace.numerics);

  const dropRate = sentences.length
    ? sentences.filter((s) => s.tier === "unsupported").length / sentences.length
    : 0;

  return { sentences, dropRate };
}
