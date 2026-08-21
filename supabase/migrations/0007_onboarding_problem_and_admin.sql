-- Onboarding: capture the problem in the user's own words, and an admin flag
-- to read the answers back (issues #233, #234).
--
-- Every existing onboarding question is segmentation: role, fields, intent,
-- experience, agent tools, referral, country. All of it drives what the home
-- surface shows first. None of it captures what a user actually experienced,
-- which is the one thing that tells us whether the product's premise is real.
--
-- The new columns sit at the end of the wizard, after everything that drives
-- personalisation, so drop-off lands on these rather than on the questions the
-- product depends on.
--
-- Every column is nullable except the opt-in, which is `not null default
-- false`: consent is off unless somebody actively turns it on, and a nullable
-- consent flag is an invitation to treat "unknown" as "yes".

alter table onboarding_responses
  add column if not exists wrong_summary_story text,
  add column if not exists verify_method       text[] not null default '{}',
  add column if not exists verify_method_other text,
  add column if not exists contact_opt_in      boolean not null default false,
  add column if not exists field_freetext      text,
  add column if not exists weekly_trigger      text;

-- Issue #234: read access to everyone's answers, set by hand in the SQL editor.
-- No role-management UI, deliberately: an admin-granting screen is a much
-- larger security surface than one boolean nobody can reach from the app.
alter table profiles
  add column if not exists is_admin boolean not null default false;

-- The existing RLS policy (onboarding_own, 0001_platform.sql) still restricts
-- a user to their own row. The admin read deliberately does NOT relax it:
-- lib/data/supabase-adapter.ts reads through the service-role client, which
-- bypasses RLS, and the authorisation check lives in the admin route. Widening
-- the policy would grant admin reads to any client holding an anon key.
