-- Pepiros platform schema
--
-- Scope: the SOCIAL layer only (who published what, who follows whom, how much
-- reach a post got). The GROUNDING domain -- papers, sections, chunks, numerics,
-- nodes, evidence, anchors, jobs, mcp_tokens -- already has 20 tables defined in
-- lib/db/schema.ts and is deliberately NOT merged into this migration. The two
-- domains share only a paper identifier.
--
-- Apply with:  supabase db push        (or paste into the SQL editor)
--
-- Until this is applied, the app runs on lib/data/seed.ts via the adapter in
-- lib/data/adapter.ts, so nothing here is required for the demo to work.

begin;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type user_role as enum (
  'grad_student', 'researcher', 'clinician', 'educator', 'engineer', 'curious_reader'
);

create type referral_source as enum (
  'reddit', 'x', 'github', 'friend', 'search', 'other'
);

create type experience_level as enum (
  'first_papers', 'few_a_month', 'weekly', 'its_my_job'
);

create type reading_intent as enum (
  'keep_up', 'verify_before_citing', 'lit_review', 'teach', 'connect_agent'
);

create type post_status as enum ('published', 'draft', 'archived');

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  username       text not null unique
                   check (username ~ '^[a-z0-9_]{3,30}$'),
  display_name   text not null,
  bio            text not null default '',
  avatar_initials text not null default '',
  onboarded      boolean not null default false,
  created_at     timestamptz not null default now()
);

comment on table profiles is
  'Public profile, one row per auth user. Counts (followers/following) are derived from the follows table rather than denormalised, so they cannot drift.';

-- ---------------------------------------------------------------------------
-- Onboarding
-- ---------------------------------------------------------------------------

create table onboarding_responses (
  profile_id      uuid primary key references profiles (id) on delete cascade,
  country         text,
  referral_source referral_source,
  referral_other  text,
  role            user_role,
  -- capped at 3 in the wizard; enforced here too so the API cannot drift from it
  fields          text[] not null default '{}'
                    check (array_length(fields, 1) is null or array_length(fields, 1) <= 3),
  intent          reading_intent,
  experience      experience_level,
  agent_tools     text[] not null default '{}',
  completed_at    timestamptz
);

-- ---------------------------------------------------------------------------
-- Posts
-- ---------------------------------------------------------------------------

create table posts (
  id                 uuid primary key default gen_random_uuid(),
  author_id          uuid not null references profiles (id) on delete cascade,
  -- free-text rather than a FK: the grounding domain owns papers, and a post
  -- can reference a catalogue paper that was never ingested into a workspace
  paper_id           text not null,
  title              text not null,
  authors            text[] not null default '{}',
  year               int,
  venue              text,
  field              text,
  open_access        boolean not null default false,
  source_url         text,
  status             post_status not null default 'draft',
  published_at       timestamptz,
  -- grounding stats, copied from the verifier at publish time so the feed can
  -- sort on them without touching the grounding tables
  grounding_coverage numeric(4, 3) check (grounding_coverage between 0 and 1),
  drop_rate          numeric(4, 3) check (drop_rate between 0 and 1),
  created_at         timestamptz not null default now(),

  unique (author_id, paper_id)
);

create index posts_author_status_idx on posts (author_id, status);
create index posts_published_idx on posts (published_at desc nulls last)
  where status = 'published';
create index posts_field_idx on posts (field) where status = 'published';

-- ---------------------------------------------------------------------------
-- Comments, likes, follows
-- ---------------------------------------------------------------------------

create table comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references posts (id) on delete cascade,
  author_id  uuid not null references profiles (id) on delete cascade,
  body       text not null check (length(body) between 1 and 4000),
  -- set when the comment is anchored to one claim rather than the whole paper
  claim_ref  text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

create index comments_post_idx on comments (post_id, created_at desc);

create table likes (
  post_id    uuid not null references posts (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, profile_id)
);

create table follows (
  follower_id uuid not null references profiles (id) on delete cascade,
  followee_id uuid not null references profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  -- a self-follow would inflate every follower count by one
  check (follower_id <> followee_id)
);

create index follows_followee_idx on follows (followee_id);

-- ---------------------------------------------------------------------------
-- Reach
-- ---------------------------------------------------------------------------

-- One row per post per day. Pre-aggregated rather than storing raw view events,
-- because every question the dashboard asks is "per day over a range" and the
-- raw events would be orders of magnitude larger for no extra answer.
create table post_metrics (
  post_id  uuid not null references posts (id) on delete cascade,
  day      date not null,
  views    int not null default 0 check (views >= 0),
  likes    int not null default 0 check (likes >= 0),
  comments int not null default 0 check (comments >= 0),
  primary key (post_id, day)
);

create index post_metrics_day_idx on post_metrics (day desc);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table profiles             enable row level security;
alter table onboarding_responses enable row level security;
alter table posts                enable row level security;
alter table comments             enable row level security;
alter table likes                enable row level security;
alter table follows              enable row level security;
alter table post_metrics         enable row level security;

-- Profiles are public to read, writable only by their owner.
create policy profiles_read   on profiles for select using (true);
create policy profiles_insert on profiles for insert with check (auth.uid() = id);
create policy profiles_update on profiles for update using (auth.uid() = id);

-- Onboarding answers are private to the person who gave them.
create policy onboarding_own on onboarding_responses
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- Published posts are world-readable; drafts and archived posts are not.
create policy posts_read_published on posts
  for select using (status = 'published' or auth.uid() = author_id);
create policy posts_write_own on posts
  for all using (auth.uid() = author_id) with check (auth.uid() = author_id);

-- Comments are readable wherever the post is readable, writable by their author.
create policy comments_read on comments
  for select using (
    exists (
      select 1 from posts p
      where p.id = comments.post_id
        and (p.status = 'published' or p.author_id = auth.uid())
    )
  );
create policy comments_write_own on comments
  for all using (auth.uid() = author_id) with check (auth.uid() = author_id);

create policy likes_read on likes for select using (true);
create policy likes_write_own on likes
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy follows_read on follows for select using (true);
create policy follows_write_own on follows
  for all using (auth.uid() = follower_id) with check (auth.uid() = follower_id);

-- Reach is the author's own business. No public read: a competitor should not
-- be able to enumerate how much traffic someone else's post got.
create policy post_metrics_read_own on post_metrics
  for select using (
    exists (
      select 1 from posts p
      where p.id = post_metrics.post_id and p.author_id = auth.uid()
    )
  );

commit;
