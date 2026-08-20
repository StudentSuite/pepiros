-- Profile email, for cross-provider account linking (issues #167/#171).
--
-- Google sign-in used to never touch the profiles table at all -- it built
-- a Profile purely from Google metadata and carried it inline in the
-- session cookie, since "a Google account has no row in the seed adapter"
-- (true for the seed adapter, never true for the Supabase-backed one). On
-- the real, Supabase-backed platform this meant two separate bugs: no
-- profiles row exists for a Google-only user at all (posts/comments/likes/
-- follows/sessions/onboarding_responses all have a real FK to profiles.id,
-- so any write for that user 500s on a foreign-key violation), and a user
-- who signs up with password+email then later uses "Continue with Google"
-- with that same email gets a second, disconnected identity rather than
-- being recognized as the same account.
--
-- profiles has no email column today -- email lives only on auth.users,
-- and the Admin API has no email-filtered lookup in the installed
-- supabase-js version (only paginated listUsers()), so there is no cheap,
-- safe way to look up "does a profile already exist for this email"
-- without one. A read-model copy here (auth.users stays the canonical
-- source) is what lib/auth/google.ts's real fix needs: find-by-id (already
-- linked), else find-by-email (existing password account -- sign in as
-- that profile instead of creating a second one), else create.
--
-- Nullable: existing rows predate this column and are not backfilled here
-- (this is an early-stage app with no real production user base yet, per
-- README's own "early build, moving fast" framing) -- every new row from
-- this point on (both createAccount and the Google flow) populates it.
--
-- Apply with:  supabase db push     (or paste into the SQL editor)

begin;

alter table profiles
  add column email text;

comment on column profiles.email is
  'Read-model copy of the auth.users email this profile belongs to -- auth.users stays canonical. Used only for issues #167/#171''s cross-provider account-linking lookup; nullable, not backfilled for pre-existing rows.';

commit;
