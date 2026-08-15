-- Guest demo account seed.
--
-- Depends on the auth user already existing. It was created 2026-08-15 with:
--   id    995bcff1-6712-4dba-96ef-776e5e867af2
--   email guest@users.pepiros.dev
--
-- The adapter maps a username to `<username>@users.pepiros.dev` and verifies the
-- password through Supabase Auth, so the email format above is load-bearing.
--
-- Idempotent: safe to re-run. Every insert is ON CONFLICT DO UPDATE / DO NOTHING,
-- and the metrics block clears its own rows first.
--
-- Apply with:  supabase db push     (or paste into the SQL editor)

begin;

-- Fail loudly rather than seeding an orphaned profile if the auth user is
-- missing, which is the one mistake that would make guest sign-in fail with a
-- confusing error much later.
do $$
begin
  if not exists (
    select 1 from auth.users where id = '995bcff1-6712-4dba-96ef-776e5e867af2'
  ) then
    raise exception
      'auth user 995bcff1-6712-4dba-96ef-776e5e867af2 (guest@users.pepiros.dev) does not exist. Create it in Supabase Auth before running this migration.';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Profile
-- ---------------------------------------------------------------------------

insert into profiles (id, username, display_name, bio, avatar_initials, onboarded, created_at)
values (
  '995bcff1-6712-4dba-96ef-776e5e867af2',
  'guest',
  'Guest Reader',
  'A demo account. Everything here is generated so you can see how a real Pepiros account behaves without signing up.',
  'GR',
  true,
  '2026-03-02T00:00:00Z'
)
on conflict (id) do update set
  username = excluded.username,
  display_name = excluded.display_name,
  bio = excluded.bio,
  avatar_initials = excluded.avatar_initials,
  onboarded = excluded.onboarded;

insert into onboarding_responses (
  profile_id, country, referral_source, role, fields, intent, experience, agent_tools, completed_at
)
values (
  '995bcff1-6712-4dba-96ef-776e5e867af2',
  'India', 'github', 'grad_student',
  array['Machine learning', 'Neuroscience', 'Clinical medicine'],
  'verify_before_citing', 'weekly',
  array['claude', 'cursor'],
  '2026-03-02T00:00:00Z'
)
on conflict (profile_id) do update set
  country = excluded.country,
  fields = excluded.fields,
  completed_at = excluded.completed_at;

-- ---------------------------------------------------------------------------
-- Posts
--
-- The first fourteen catalogue papers, matching lib/data/papers.ts so the
-- Supabase-backed account looks the same as the seeded one. Two drafts and one
-- archived, so the status tabs and filters have something real to separate.
-- ---------------------------------------------------------------------------

insert into posts (
  author_id, paper_id, title, authors, year, venue, field,
  open_access, source_url, status, published_at, grounding_coverage, drop_rate
)
values
  ('995bcff1-6712-4dba-96ef-776e5e867af2','p-attention','Attention Is All You Need',
   array['Ashish Vaswani','Noam Shazeer','Niki Parmar','Jakob Uszkoreit'],2017,'NeurIPS','Machine learning',
   true,'https://arxiv.org/abs/1706.03762','published', now() - interval '41 days', 0.79, 0.031),

  ('995bcff1-6712-4dba-96ef-776e5e867af2','p-resnet','Deep Residual Learning for Image Recognition',
   array['Kaiming He','Xiangyu Zhang','Shaoqing Ren','Jian Sun'],2016,'CVPR','Computer vision',
   true,'https://arxiv.org/abs/1512.03385','published', now() - interval '96 days', 0.88, 0.052),

  ('995bcff1-6712-4dba-96ef-776e5e867af2','p-bert','BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding',
   array['Jacob Devlin','Ming-Wei Chang','Kenton Lee','Kristina Toutanova'],2019,'NAACL','Natural language processing',
   true,'https://arxiv.org/abs/1810.04805','published', now() - interval '12 days', 0.72, 0.088),

  ('995bcff1-6712-4dba-96ef-776e5e867af2','p-gpt3','Language Models are Few-Shot Learners',
   array['Tom B. Brown','Benjamin Mann','Nick Ryder','Melanie Subbiah'],2020,'NeurIPS','Natural language processing',
   true,'https://arxiv.org/abs/2005.14165','published', now() - interval '63 days', 0.81, 0.044),

  ('995bcff1-6712-4dba-96ef-776e5e867af2','p-ddpm','Denoising Diffusion Probabilistic Models',
   array['Jonathan Ho','Ajay Jain','Pieter Abbeel'],2020,'NeurIPS','Machine learning',
   true,'https://arxiv.org/abs/2006.11239','draft', null, 0.66, 0.101),

  ('995bcff1-6712-4dba-96ef-776e5e867af2','p-cot','Chain-of-Thought Prompting Elicits Reasoning in Large Language Models',
   array['Jason Wei','Xuezhi Wang','Dale Schuurmans','Maarten Bosma'],2022,'NeurIPS','Natural language processing',
   true,'https://arxiv.org/abs/2201.11903','published', now() - interval '7 days', 0.91, 0.019),

  ('995bcff1-6712-4dba-96ef-776e5e867af2','p-adam','Adam: A Method for Stochastic Optimization',
   array['Diederik P. Kingma','Jimmy Ba'],2015,'ICLR','Statistics',
   true,'https://arxiv.org/abs/1412.6980','published', now() - interval '128 days', 0.85, 0.037),

  ('995bcff1-6712-4dba-96ef-776e5e867af2','p-gan','Generative Adversarial Networks',
   array['Ian J. Goodfellow','Jean Pouget-Abadie','Mehdi Mirza','Bing Xu'],2014,'NeurIPS','Machine learning',
   true,'https://arxiv.org/abs/1406.2661','published', now() - interval '73 days', 0.87, 0.026),

  ('995bcff1-6712-4dba-96ef-776e5e867af2','p-scaling','Scaling Laws for Neural Language Models',
   array['Jared Kaplan','Sam McCandlish','Tom Henighan','Tom B. Brown'],2020,'arXiv preprint','Machine learning',
   true,'https://arxiv.org/abs/2001.08361','published', now() - interval '25 days', 0.76, 0.067),

  ('995bcff1-6712-4dba-96ef-776e5e867af2','p-instructgpt','Training Language Models to Follow Instructions with Human Feedback',
   array['Long Ouyang','Jeff Wu','Xu Jiang','Diogo Almeida'],2022,'NeurIPS','Natural language processing',
   true,'https://arxiv.org/abs/2203.02155','draft', null, 0.69, 0.094),

  ('995bcff1-6712-4dba-96ef-776e5e867af2','p-sam','Segment Anything',
   array['Alexander Kirillov','Eric Mintun','Nikhila Ravi','Hanzi Mao'],2023,'ICCV','Computer vision',
   true,'https://arxiv.org/abs/2304.02643','published', now() - interval '3 days', 0.94, 0.012),

  ('995bcff1-6712-4dba-96ef-776e5e867af2','p-imagenet','ImageNet Classification with Deep Convolutional Neural Networks',
   array['Alex Krizhevsky','Ilya Sutskever','Geoffrey E. Hinton'],2012,'NeurIPS','Computer vision',
   true,'https://papers.nips.cc/paper_files/paper/2012/hash/c399862d3b9d6b76c8436e924a68c45b-Abstract.html','published', now() - interval '154 days', 0.83, 0.041),

  ('995bcff1-6712-4dba-96ef-776e5e867af2','p-alphafold','Highly Accurate Protein Structure Prediction with AlphaFold',
   array['John Jumper','Richard Evans','Alexander Pritzel','Tim Green'],2021,'Nature','Genomics',
   true,'https://www.nature.com/articles/s41586-021-03819-2','archived', now() - interval '110 days', 0.78, 0.058),

  ('995bcff1-6712-4dba-96ef-776e5e867af2','p-crispr','A Programmable Dual-RNA-Guided DNA Endonuclease in Adaptive Bacterial Immunity',
   array['Martin Jinek','Krzysztof Chylinski','Ines Fonfara','Michael Hauer'],2012,'Science','Genomics',
   false,'https://www.science.org/doi/10.1126/science.1225829','published', now() - interval '88 days', 0.74, 0.072)

on conflict (author_id, paper_id) do update set
  title = excluded.title,
  status = excluded.status,
  published_at = excluded.published_at,
  grounding_coverage = excluded.grounding_coverage,
  drop_rate = excluded.drop_rate;

-- ---------------------------------------------------------------------------
-- Reach
--
-- 180 days per published post. Shape rather than noise: a launch spike that
-- decays over the first fortnight, weekly seasonality with quieter weekends,
-- and a per-post baseline. A flat random series would not tell you whether the
-- chart works.
-- ---------------------------------------------------------------------------

delete from post_metrics
where post_id in (
  select id from posts where author_id = '995bcff1-6712-4dba-96ef-776e5e867af2'
);

insert into post_metrics (post_id, day, views, likes, comments)
select
  p.id,
  d::date,
  v.views,
  greatest(0, round(v.views * (0.03 + 0.05 * ((hashtext(p.paper_id || d::text) % 100 + 100) % 100) / 100.0))::int),
  greatest(0, round(v.views * 0.004)::int)
from posts p
cross join lateral generate_series(
  greatest(p.published_at::date, (now() - interval '180 days')::date),
  now()::date,
  interval '1 day'
) as d
cross join lateral (
  select greatest(0, round(
    -- per-post baseline, 20..140
    (20 + ((hashtext(p.paper_id) % 120 + 120) % 120))
    -- launch spike decaying over ~14 days
    * (1 + greatest(0, 14 - (d::date - p.published_at::date)) * 0.34)
    -- quieter at weekends
    * (case when extract(dow from d) in (0, 6) then 0.62 else 1 end)
    -- day-to-day jitter, deterministic per post and day
    * (0.72 + ((hashtext(p.paper_id || d::text) % 56 + 56) % 56) / 100.0)
  )::int) as views
) v
where p.author_id = '995bcff1-6712-4dba-96ef-776e5e867af2'
  and p.status = 'published'
  and p.published_at is not null;

commit;
