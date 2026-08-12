import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * MCP prompts (docs/PLAN-V1.md §13.3). These are the four workflows worth
 * one-clicking, and each is written to push the model toward the tools rather
 * than toward its own recall -- `audit-this-summary` in particular is the
 * §13.5 demo beat as a reusable prompt.
 */
export function registerPrompts(server: McpServer): void {
  server.registerPrompt(
    "brief-me-on-this-paper",
    {
      title: "Brief me on this paper",
      description: "Grounded briefing on one paper, every claim cited to a located quote.",
      argsSchema: { workspace_id: z.string(), paper_id: z.string() },
    },
    ({ workspace_id, paper_id }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              `Brief me on paper ${paper_id} in workspace ${workspace_id}.`,
              "",
              "Use get_outline for structure, then search_paper to pull the text you cite.",
              "For every factual claim you make, cite the stable id (e.g. C7) you got it from,",
              "and run verify_claim on your own key claims before presenting them.",
              "If verification returns unsupported, say so plainly instead of rewording until it passes.",
            ].join("\n"),
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    "audit-this-summary",
    {
      title: "Audit this summary",
      description: "Check an externally-written summary sentence by sentence against the source.",
      argsSchema: { workspace_id: z.string(), summary: z.string() },
    },
    ({ workspace_id, summary }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              `Audit this summary against workspace ${workspace_id}:`,
              "",
              summary,
              "",
              "For each sentence: use search_paper to find the chunk it should rest on, then",
              "verify_claim with the quote you found. Report a per-sentence verdict of",
              "quote located / paraphrase / unsupported, and a final count of how many failed.",
              "Do not repair a failing sentence -- report it.",
            ].join("\n"),
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    "where-do-these-disagree",
    {
      title: "Where do these disagree",
      description: "Surface two-sided contradictions across the workspace's papers.",
      argsSchema: { workspace_id: z.string(), concept: z.string().optional() },
    },
    ({ workspace_id, concept }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              `Find where the papers in workspace ${workspace_id} disagree${concept ? ` about ${concept}` : ""}.`,
              "",
              "Start with find_contradictions. For each pair, show both quotes side by side with",
              "their pages, then say what would have to be true for both to hold -- differing",
              "populations, timescales, or measures often explain an apparent contradiction.",
            ].join("\n"),
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    "what-does-this-not-establish",
    {
      title: "What does this not establish",
      description: "The inverse of a summary: what the paper's own results do not support.",
      argsSchema: { workspace_id: z.string(), paper_id: z.string() },
    },
    ({ workspace_id, paper_id }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              `For paper ${paper_id} in workspace ${workspace_id}, list what its results do NOT establish.`,
              "",
              "Use paper_facts with kind=numeric_ledger to see what was actually measured, and",
              "kind=coverage to see how much of the paper is anchored at all.",
              "Look for: correlation stated near causal language, a surrogate endpoint standing in",
              "for the outcome readers care about, a result in one population read as general, or a",
              "short follow-up read as long-term. Tie each item to a specific number or quote.",
            ].join("\n"),
          },
        },
      ],
    }),
  );
}
