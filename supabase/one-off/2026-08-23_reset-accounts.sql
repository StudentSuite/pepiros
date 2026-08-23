-- One-off cleanup, 2026-08-23. Paste the whole file into the Supabase SQL
-- editor and run once.
--
-- Does four things:
--   1. Applies migration 0008 (furthest_step), which was never applied. Until
--      it is, the onboarding drop-off tracking records nothing and the admin
--      page shows "step 0" for everyone.
--   2. Backfills profiles.email from auth.users. 0005 added the column but
--      deliberately did not backfill, so every existing row reads null.
--   3. Deletes every account except @anay and @guest.
--   4. Prints what survived, so the result is visible rather than assumed.
--
-- DESTRUCTIVE. Step 3 cascades: profiles.id references auth.users(id) on
-- delete cascade, and posts, comments, likes, follows, sessions and
-- onboarding_responses all reference profiles.id the same way. Deleting the
-- auth user is the single operation that removes the whole tree, which is why
-- this deletes from auth.users rather than from profiles.
--
-- Wrapped in one transaction: if any step fails, nothing is applied.

begin;

-- ---------------------------------------------------------------------------
-- 1. Migration 0008: furthest_step
-- ---------------------------------------------------------------------------

alter table onboarding_responses
  add column if not exists furthest_step integer not null default 0;

-- ---------------------------------------------------------------------------
-- 2. Backfill profiles.email from the canonical source
-- ---------------------------------------------------------------------------

update profiles p
   set email = u.email
  from auth.users u
 where u.id = p.id
   and p.email is distinct from u.email;

-- ---------------------------------------------------------------------------
-- 3. Delete every account except @anay and @guest
--
-- `not exists` rather than `not in`: a null id anywhere in the subquery would
-- make `not in` return no rows at all, silently deleting nothing.
--
-- This also removes any auth.users row that has no profile at all, which is
-- what an abandoned half-finished signup looks like.
-- ---------------------------------------------------------------------------

delete from auth.users u
 where not exists (
   select 1
     from profiles p
    where p.id = u.id
      and p.username in ('anay', 'guest')
 );

commit;

-- ---------------------------------------------------------------------------
-- 4. What survived
-- ---------------------------------------------------------------------------

select
  p.username,
  p.display_name,
  p.email,
  p.onboarded,
  o.furthest_step,
  o.completed_at
from profiles p
left join onboarding_responses o on o.profile_id = p.id
order by p.created_at;
