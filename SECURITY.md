# Security Policy

## Supported versions

Only the latest commit on `main` is supported; there are no maintained release branches to backport fixes to. Pepiros is pre-1.0 and moves fast, but it is deployed with real accounts and real data (see below), not a sandbox.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for a security vulnerability. Instead, use GitHub's private reporting flow:

**[Report a vulnerability](https://github.com/StudentSuite/pepiros/security/advisories/new)** (Security tab → "Report a vulnerability").

Include what you can:

- A description of the vulnerability and its potential impact.
- Steps to reproduce, or a proof of concept.
- The affected file(s)/commit.

In scope: anything that lets one account read or change another account's data, anything that lets an unauthenticated request reach a protected route, and anything that causes Pepiros to attribute a quote to a source it did not come from (a grounding tool that can be made to point at the wrong sentence has failed at the only thing it claims to do). Also in scope: anything that gets past upload validation itself, such as a spoofed file type, an oversized payload, or a page count that slips through uncounted before it reaches the parser.

We will acknowledge reports as promptly as we can: this is a two-person project without a dedicated security team, so response times may vary. Please give us a reasonable window to fix an issue before any public disclosure.

## Current posture, stated honestly

- Sessions are signed, HTTP-only cookies with a 7-day lifetime and no silent renewal, and are server-side revocable: signing out, or signing out everywhere, actually kills the session rather than just clearing a cookie the server would still honor.
- Protected routes are enforced in middleware, not only hidden from search engines or robots.txt.
- An MCP token carries its own scope (read-only, or read and write), can be pinned to a single workspace rather than every workspace an account owns, and can be revoked independently of the account session that minted it. Every MCP write path (`create_node`, and the equivalent HTTP endpoints) re-verifies submitted evidence server-side; nothing trusts a caller's own assertion that a quote is `quote_located`.
- The grounding spine (`lib/grounding/*`) and its thresholds are covered by dedicated tests (anchor resolution, fuzzy matching, numeric entailment, reverse audit, tier assignment), not just code review.
- `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security (`lib/supabase/server.ts`'s `createSupabaseServiceClient`) and must never be exposed to the client or used in a route that echoes request input back into a query.
- There is no bug bounty, no formal SLA, and no third-party audit. This is a two-person project, and pretending otherwise would be its own kind of security problem.

## Running this repository locally

No Supabase project, database, or model-provider key is required to run the app against its bundled fixture workspace (`fixtures/workspace.json`); doing so touches no live infrastructure or third-party API. A real `.env` is only needed to exercise real accounts, real ingest, or the MCP server against a real backend -- see `README.md`'s Configuration section.
