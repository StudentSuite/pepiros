-- Per-step drop-off for the admin onboarding view (issue #252).
--
-- Every onboarding question is independently skippable (0007's own comment),
-- so a non-null field cannot stand in for "reached this step" -- a user can
-- walk all ten steps and answer nothing. This column is the actual signal:
-- the wizard now saves it on every step advance/back, regardless of what
-- (if anything) got filled in at that step.
--
-- Existing rows predate this column. A row with completed_at already set
-- did walk the whole wizard by definition, so it is backfilled to 10; an
-- incomplete row's true furthest step is genuinely unknown and stays at the
-- default 0 rather than guessed at from which fields happen to be filled.
alter table onboarding_responses
  add column if not exists furthest_step integer not null default 0;

update onboarding_responses
set furthest_step = 10
where completed_at is not null and furthest_step = 0;
