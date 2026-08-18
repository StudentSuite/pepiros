-- Notification preferences (issue #70).
--
-- components/settings/NotificationPrefs.tsx's toggle() only ever updated
-- local component state -- no schema existed anywhere to persist to
-- (checked supabase/migrations/ and lib/data/types.ts), unlike #67/#69
-- which just needed an existing column wired up. A jsonb column on
-- profiles rather than a new table: this is 4 booleans with no need for
-- per-row history, a foreign key, or independent querying -- a table
-- would just be a slower way to store the same object.
--
-- Apply with:  supabase db push     (or paste into the SQL editor)

begin;

alter table profiles
  add column notification_prefs jsonb not null default '{"follow": true, "comment": true, "like": false, "digest": true}'::jsonb;

comment on column profiles.notification_prefs is
  'Toggle state for components/settings/NotificationPrefs.tsx: follow/comment/like/digest booleans. Defaults match that component''s previous hardcoded client-only defaults, so an existing profile''s first real read matches what it already displayed.';

commit;
