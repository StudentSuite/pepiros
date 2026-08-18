/**
 * Drizzle schema, full table list per plan.md §5. No vector column, no HNSW
 * index (pgvector/embeddings/BM25 killed -- whole paper goes in context,
 * prompt-cached, stable citation ids instead).
 *
 * All ids are `text`, not `uuid`. The app assigns its own human-readable,
 * structurally meaningful ids (`paper-a1b2c3d4`, `{paperId}-c3` for a chunk,
 * `synth-consensus-{workspaceId}` for a synthesis node, `mcp-<ts>-<rand>` from
 * the MCP create_node path, `ws-1` for the bundled fixture) rather than
 * Postgres-generated UUIDs -- chunk/numeric ids are deliberately prefixed by
 * their paper so a citation id stays legible, and several ids are recomputed
 * deterministically (e.g. synthesisNodeId) rather than randomly, which a
 * `uuid` column's `defaultRandom()` can't express. No row here is ever
 * inserted without the app already having assigned its id.
 */
import {
  pgTable,
  text,
  integer,
  real,
  boolean,
  timestamp,
  jsonb,
  primaryKey,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { PaperArchetype } from "@/types/anchor";

/**
 * Must stay identical to PaperArchetype in types/anchor.ts. These two silently
 * drifted apart once already, so the guard below fails `npm run typecheck`
 * rather than letting a classifier output become unassignable at runtime.
 */
export const paperArchetype = pgEnum("paper_archetype", [
  "rct",
  "cohort_study",
  "systematic_review",
  "method_paper",
  "ml_model",
  "case_report",
  "bioinformatics_pipeline",
  "preprint_theory",
  "dataset_paper",
]);

type AssertEqual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _archetypeEnumMatchesContract: AssertEqual<
  (typeof paperArchetype.enumValues)[number],
  PaperArchetype
> = true;
void _archetypeEnumMatchesContract;

export const chunkKind = pgEnum("chunk_kind", [
  "prose",
  "figure_caption",
  "table",
  "equation",
]);

export const nodeType = pgEnum("node_type", [
  "paper",
  "pillar",
  "leaf",
  "thread",
  "synthesis",
]);

export const edgeKind = pgEnum("edge_kind", [
  "contains",
  "relates",
  "derived_from",
  "agrees",
  "contradicts",
  "extends",
  "shares_method",
  "cites",
]);

export const evidenceTier = pgEnum("evidence_tier", [
  "quote_located",
  "paraphrase",
  "unsupported",
]);

export const jobStatus = pgEnum("job_status", [
  "queued",
  "running",
  "done",
  "failed",
]);

// --- Core corpus ------------------------------------------------------

export const workspaces = pgTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  /**
   * Optimistic concurrency (issue #103). Every mutating service function
   * (createNode/updateNodeBody/deleteNode/promoteToThread in nodes.ts,
   * runSynthesis, runIngest) reads a full Workspace snapshot, changes one
   * thing in memory, then re-upserts the whole thing -- a lost-update race if
   * two requests overlap, worst on runIngest specifically since a real parse
   * + generator fan-out holds that snapshot in memory for 15-45s. saveWorkspace()
   * increments this and only commits when the caller's expected version still
   * matches, so a stale write fails loudly (UserFacingError) instead of
   * silently overwriting whatever landed in between.
   */
  version: integer("version").notNull().default(1),
});

export const papers = pgTable("papers", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  authors: jsonb("authors").$type<string[]>().notNull().default([]),
  year: integer("year"),
  archetype: paperArchetype("archetype"),
  sourceUrl: text("source_url"),
  pdfStoragePath: text("pdf_storage_path"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sections = pgTable("sections", {
  id: text("id").primaryKey(),
  paperId: text("paper_id")
    .notNull()
    .references(() => papers.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  order: integer("order").notNull(),
});

export const chunks = pgTable("chunks", {
  id: text("id").primaryKey(),
  paperId: text("paper_id")
    .notNull()
    .references(() => papers.id, { onDelete: "cascade" }),
  sectionId: text("section_id").references(() => sections.id, {
    onDelete: "set null",
  }),
  kind: chunkKind("kind").notNull().default("prose"),
  page: integer("page").notNull(),
  text: text("text").notNull(),
  /**
   * The n in the "C{n}" citation id a model is shown (plan.md §2 keeps stable
   * citation ids precisely so there is no embedding layer). Assigned once at
   * ingest, unique within the workspace, and never reused or renumbered:
   * evidence rows store the rendered ref, so renumbering would silently
   * re-point already-written citations at different text.
   */
  ordinal: integer("ordinal").notNull(),
  /** AnchorRect[] (types/anchor.ts) -- the chunk's search window for anchoring. */
  rects: jsonb("rects").$type<Array<{ page: number; x0: number; y0: number; x1: number; y1: number }>>().notNull(),
});

export const figures = pgTable("figures", {
  id: text("id").primaryKey(),
  paperId: text("paper_id")
    .notNull()
    .references(() => papers.id, { onDelete: "cascade" }),
  page: integer("page").notNull(),
  caption: text("caption"),
  storagePath: text("storage_path").notNull(),
});

export const numerics = pgTable("numerics", {
  id: text("id").primaryKey(),
  chunkId: text("chunk_id")
    .notNull()
    .references(() => chunks.id, { onDelete: "cascade" }),
  rawText: text("raw_text").notNull(),
  value: real("value").notNull(),
  unit: text("unit"),
  comparator: text("comparator"),
  role: text("role").notNull(),
  /** The n in "N{n}". Same stability contract as chunks.ordinal. */
  ordinal: integer("ordinal").notNull(),
});

export const references_ = pgTable("references_", {
  id: text("id").primaryKey(),
  paperId: text("paper_id")
    .notNull()
    .references(() => papers.id, { onDelete: "cascade" }),
  rawText: text("raw_text").notNull(),
  doi: text("doi"),
  externalId: text("external_id"),
});

// --- Graph layer --------------------------------------------------------

export const nodes = pgTable("nodes", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  paperId: text("paper_id").references(() => papers.id, { onDelete: "cascade" }),
  type: nodeType("type").notNull(),
  title: text("title").notNull(),
  bodyMd: text("body_md").notNull().default(""),
  pillarIndex: integer("pillar_index"),
  x: real("x").notNull().default(0),
  y: real("y").notNull().default(0),
  stale: boolean("stale").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const nodeVersions = pgTable("node_versions", {
  id: text("id").primaryKey(),
  nodeId: text("node_id")
    .notNull()
    .references(() => nodes.id, { onDelete: "cascade" }),
  bodyMd: text("body_md").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const edges = pgTable("edges", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  kind: edgeKind("kind").notNull(),
  sourceId: text("source_id")
    .notNull()
    .references(() => nodes.id, { onDelete: "cascade" }),
  targetId: text("target_id")
    .notNull()
    .references(() => nodes.id, { onDelete: "cascade" }),
});

export const evidence = pgTable("evidence", {
  id: text("id").primaryKey(),
  nodeId: text("node_id")
    .notNull()
    .references(() => nodes.id, { onDelete: "cascade" }),
  chunkId: text("chunk_id").references(() => chunks.id, { onDelete: "set null" }),
  /** Stable citation id as shown to the model, e.g. "C7", "F3", "N12". */
  refId: text("ref_id").notNull(),
  quote: text("quote"),
  /** AnchorRect[] -- null once dropped by the verifier. */
  spans: jsonb("spans").$type<Array<{ page: number; x0: number; y0: number; x1: number; y1: number }>>(),
  tier: evidenceTier("tier").notNull(),
  matchScore: real("match_score").notNull(),
  numericOk: boolean("numeric_ok"),
});

// --- Conversation + learning ---------------------------------------------

export const conversations = pgTable("conversations", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const flashcards = pgTable("flashcards", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  nodeId: text("node_id").references(() => nodes.id, { onDelete: "set null" }),
  front: text("front").notNull(),
  back: text("back").notNull(),
});

export const quizzes = pgTable("quizzes", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
});

export const quizAttempts = pgTable("quiz_attempts", {
  id: text("id").primaryKey(),
  quizId: text("quiz_id")
    .notNull()
    .references(() => quizzes.id, { onDelete: "cascade" }),
  score: real("score").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const learningState = pgTable("learning_state", {
  nodeId: text("node_id")
    .notNull()
    .references(() => nodes.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
}, (table) => [primaryKey({ columns: [table.nodeId, table.workspaceId] })]);

// --- Jobs + sharing -------------------------------------------------------

export const jobs = pgTable("jobs", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  status: jobStatus("status").notNull().default("queued"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const jobEvents = pgTable("job_events", {
  id: text("id").primaryKey(),
  jobId: text("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const shareTokens = pgTable("share_tokens", {
  token: text("token").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * MCP client tokens (docs/PLAN-V1.md §13.4). That section's security rules are
 * marked non-negotiable, and each column below exists to satisfy one:
 *
 * - `tokenHash`, never the raw token ("Store token hashes, never raw tokens").
 *   A leaked database row must not be a usable credential.
 * - `id` is a non-secret handle, so a tool call can be logged and rate-limited
 *   by token identity without the log holding the secret.
 * - `scope` gates writes: `create_node`/`add_paper` require `write`. An MCP
 *   client is untrusted input, so read-only is the useful default.
 * - `workspaceId` is nullable: "optionally pinned to a single workspace".
 *   Null means the token may reach any workspace its owner can.
 * - `revokedAt` ("Support revocation") rather than deleting the row, so an
 *   audit trail of a revoked token's past calls survives the revocation.
 *
 * Not actually backed by this table yet -- lib/services/mcpTokens.ts uses a
 * gitignored JSON file instead, on purpose: mcp/stdio.ts runs as a separate OS
 * process from the Next.js server, and needs to see a token immediately after
 * Settings mints it without a shared in-process cache. The table stays here as
 * the eventual real store once that process boundary is worth crossing with a
 * DB round-trip on every tool call.
 */
export const mcpTokenScope = pgEnum("mcp_token_scope", ["read", "write"]);

export const mcpTokens = pgTable("mcp_tokens", {
  id: text("id").primaryKey(),
  tokenHash: text("token_hash").notNull().unique(),
  scope: mcpTokenScope("scope").notNull().default("read"),
  workspaceId: text("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  label: text("label"),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- Relations ------------------------------------------------------------

export const workspacesRelations = relations(workspaces, ({ many }) => ({
  papers: many(papers),
  nodes: many(nodes),
  edges: many(edges),
}));

export const papersRelations = relations(papers, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [papers.workspaceId],
    references: [workspaces.id],
  }),
  sections: many(sections),
  chunks: many(chunks),
  figures: many(figures),
  references: many(references_),
}));

export const chunksRelations = relations(chunks, ({ one, many }) => ({
  paper: one(papers, { fields: [chunks.paperId], references: [papers.id] }),
  section: one(sections, { fields: [chunks.sectionId], references: [sections.id] }),
  numerics: many(numerics),
}));

export const nodesRelations = relations(nodes, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [nodes.workspaceId], references: [workspaces.id] }),
  paper: one(papers, { fields: [nodes.paperId], references: [papers.id] }),
  evidence: many(evidence),
  versions: many(nodeVersions),
}));

export const edgesRelations = relations(edges, ({ one }) => ({
  source: one(nodes, { fields: [edges.sourceId], references: [nodes.id] }),
  target: one(nodes, { fields: [edges.targetId], references: [nodes.id] }),
}));

export const evidenceRelations = relations(evidence, ({ one }) => ({
  node: one(nodes, { fields: [evidence.nodeId], references: [nodes.id] }),
  chunk: one(chunks, { fields: [evidence.chunkId], references: [chunks.id] }),
}));
