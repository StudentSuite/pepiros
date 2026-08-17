"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Next.js's build-time inlining for NEXT_PUBLIC_* variables only recognizes
 * a *static*, literal `process.env.NEXT_PUBLIC_X` member expression written
 * directly in the source -- it does an AST-level find-and-replace, not real
 * data-flow analysis. A computed/bracket access like `process.env[name]`
 * (this file's previous shape, with `name` a function parameter) is
 * invisible to that replacement, so it always evaluated to `undefined` in
 * the browser bundle, completely independent of what was actually
 * configured in Vercel/`.env` -- confirmed live: the deployed bundle
 * contained the string "NEXT_PUBLIC_SUPABASE_URL" (the literal argument at
 * the call site) but never the real URL value, across multiple from-scratch
 * rebuilds with no cache, regardless of the variable's Vercel configuration.
 * lib/supabase/server.ts's equivalent helper is fine with computed access
 * since server code runs in a real Node process with a real `process.env`
 * at request time -- this is specifically a client/build-time-only problem.
 *
 * Fix: pass the already-evaluated `process.env.NEXT_PUBLIC_X` expression
 * itself into a plain validator, so the literal member expression Next.js's
 * replacer looks for is actually present in the source.
 */
function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`${name} is not set. Copy .env.example to .env and fill in your Supabase project's values.`);
  }
  return value;
}

/** Browser-side client: Auth (session) + Realtime (job status) + Storage reads. */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}
