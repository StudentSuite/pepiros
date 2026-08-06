// Vitest runs in plain Node, not through Next's webpack build, so the real
// "server-only" package (a marker that only throws when imported from a
// client bundle) throws unconditionally outside webpack. Aliased in place of
// it in vitest.config.ts so files that import "server-only" (a real,
// intentional guard -- see lib/ai/client.ts, lib/agents/orchestrator.ts,
// lib/supabase/server.ts) stay testable without weakening that guard.
export {};
