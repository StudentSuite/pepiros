// GET /api/search?q=...
//
// Backs the header's search field. Read-only, public, and deliberately thin:
// all the matching lives in the data adapter (lib/data/adapter.ts's search()),
// so the seed and Supabase backends answer the same query the same way and
// this route never becomes a second place ranking is decided.
import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/data/adapter";

/**
 * Per lane, not total: five papers AND five people AND five discussions. The
 * dropdown shows a few of each and links to the full page rather than trying
 * to be the full page.
 */
const LIMIT = 5;

/**
 * A ceiling on what we will even attempt to match.
 *
 * Not a validation nicety: `q` goes into an ilike pattern, and an unbounded
 * one is an invitation to send a megabyte of text and make Postgres scan the
 * comments table against it. Truncating is friendlier than rejecting, since a
 * 200-character search term is a paste accident rather than an attack, and
 * either way the first 200 characters are what anyone meant.
 */
const MAX_QUERY_LENGTH = 200;

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("q") ?? "";
  const q = raw.slice(0, MAX_QUERY_LENGTH);

  const results = await getAdapter().search(q, LIMIT);

  return NextResponse.json(results, {
    headers: {
      // Private, because the people lane can surface accounts and a shared
      // cache keyed only on the query would serve one deployment's results to
      // another. Short max-age so retyping the same term while deciding does
      // not re-hit the database on every keystroke the debounce lets through.
      "Cache-Control": "private, max-age=30",
    },
  });
}
