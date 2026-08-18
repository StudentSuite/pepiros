-- Server-side session revocation (issue #85).
--
-- lib/auth/session.ts's signed cookie used to be pure and stateless: a
-- profile id plus an issued timestamp, HMAC-signed, with no server-side
-- record at all. That meant no way to invalidate a session early -- a
-- leaked/stolen cookie stayed valid for its full 7-day lifetime no matter
-- what, and there was no "log out everywhere" affordance. This table is
-- that record: one row per signed-in-with-password session, referenced by
-- id from inside the signed cookie itself (the cookie's signature still
-- proves it wasn't forged; this table is what lets a *legitimate* row be
-- killed on demand).
--
-- Scope: password-based sessions only. Google/federated sign-in
-- (lib/auth/session.ts's serializeInlineSession) carries the profile
-- inline in the cookie by design, with no row anywhere to reference --
-- extending revocation there means restructuring that mechanism entirely,
-- a separate, bigger change than this table.
--
-- Apply with:  supabase db push     (or paste into the SQL editor)

begin;

create table sessions (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

comment on table sessions is
  'One row per password-login session (lib/auth/session.ts). revoked_at set by logout (this one session) or "log out everywhere" (every session for the profile). A row with revoked_at null and within the cookie''s own 7-day expiry is valid.';

-- getSession() looks this up on every request that needs the real profile
-- (not the Edge-layer middleware redirect check, which stays a pure
-- signature/expiry verification with no DB round-trip).
create index sessions_profile_idx on sessions (profile_id) where revoked_at is null;

commit;
