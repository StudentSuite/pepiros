import "server-only";

/**
 * Thrown when `.message` is a deliberate, hand-authored string safe to show
 * a user verbatim -- never a raw driver/runtime error. Lives outside
 * `lib/services/` (rather than alongside `nodes.ts`, its first consumer)
 * because `lib/db/queries` needs it too (issue #103's optimistic-concurrency
 * conflict is a DB-layer condition, not a services-layer one), and the
 * repository layer should not depend on the service layer.
 *
 * The API routes that sit behind Promote/Save/Delete (issue #107) catch this
 * specifically and pass its message through; anything else is logged to
 * stderr and replaced with a generic message. `lib/services/ingestStore.ts`'s
 * `guardedWrite()` applies the same guard to every DB write.
 */
export class UserFacingError extends Error {}
