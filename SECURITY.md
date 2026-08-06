# Security Policy

## Supported versions

Pepiros is pre-1.0 and not yet deployed anywhere with live user data. Only the latest commit on `main` is supported — there are no maintained release branches to backport fixes to.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for a security vulnerability. Instead, use GitHub's private reporting flow:

**[Report a vulnerability](https://github.com/AnayDhawan/pepiros/security/advisories/new)** (Security tab → "Report a vulnerability").

Include what you can:

- A description of the vulnerability and its potential impact.
- Steps to reproduce, or a proof of concept.
- The affected file(s)/commit.

We'll acknowledge reports as promptly as we can — this is a small, active hackathon project without a dedicated security team, so response times may vary. Please give us a reasonable window to fix an issue before any public disclosure.

## Notes specific to this codebase

- No Supabase project or `GROQ_API_KEY` is provisioned in this repo by default (see `.env.example`) — running it locally against the bundled fixture does not touch any live infrastructure or third-party API.
- Once a real backend exists: `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security (see `lib/supabase/server.ts`'s `createSupabaseServiceClient`) and must never be exposed to the client or used in a route that echoes request input back into a query.
- The MCP layer (`mcp/*`, not yet implemented) is expected to re-verify every claim server-side (`lib/services/verify.ts`) rather than trust a caller-asserted `quote_located` — see `CLAUDE.md` for why this matters for this project specifically.
