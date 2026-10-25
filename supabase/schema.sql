-- ZooQuest shared leaderboard on Supabase free tier.
-- Run in the Supabase SQL editor, then set VITE_SUPABASE_URL and
-- VITE_SUPABASE_ANON_KEY (see .env.example). Only nicknames are stored.

create table if not exists public.scores (
  family_id  text not null,
  day        date not null,
  week       text not null,
  nick       text not null check (char_length(nick) between 1 and 24),
  emoji      text not null default '🦁',
  park_id    text not null,
  country    text,
  xp         integer not null check (xp >= 0 and xp <= 50000),  -- sanity cap per day
  updated_at timestamptz not null default now(),
  primary key (family_id, day)
);

create index if not exists scores_day_xp  on public.scores (day, xp desc);
create index if not exists scores_week_xp on public.scores (week, xp desc);

-- weekly league view (Gemini: resetting weekly league)
create or replace view public.weekly as
  select family_id, max(nick) as nick, max(emoji) as emoji, max(park_id) as park_id, max(country) as country, week, sum(xp)::int as xp
  from public.scores group by family_id, week;

-- all-time view
create or replace view public.family_totals as
  select family_id, max(nick) as nick, max(emoji) as emoji, max(park_id) as park_id, max(country) as country, sum(xp)::int as xp
  from public.scores group by family_id;

alter table public.scores enable row level security;
create policy "read leaderboard" on public.scores for select using (true);
create policy "write own row"   on public.scores for insert with check (true);
create policy "update own row"  on public.scores for update using (true);
-- NOTE: for production add Supabase anonymous auth and bind family_id to auth.uid().
