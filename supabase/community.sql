-- Run once in Supabase SQL editor. Enable Authentication > Anonymous sign-ins.
-- One vote per authenticated account; this does not prove one real-world person.
begin;
create table public.community_entries (
 id uuid primary key default gen_random_uuid(),
 park_id text not null check (char_length(park_id) between 1 and 200),
 author_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check (kind in ('tip','idea','place')),
 title text not null check (char_length(title) between 3 and 100),
 body text not null check (char_length(body) between 10 and 1500),
 created_at timestamptz not null default now()
);
create table public.community_confirmations (
 entry_id uuid not null references public.community_entries(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(entry_id,user_id)
);
create index community_park_date on public.community_entries(park_id,created_at desc);
alter table public.community_entries enable row level security;
alter table public.community_confirmations enable row level security;
-- Tables are not readable/writable through REST. Only the public feed and RPCs below.
revoke all on public.community_entries, public.community_confirmations from anon, authenticated;
create view public.community_feed as
 select e.id,e.park_id,e.kind,e.title,e.body,e.created_at,
 count(c.user_id)::int as confirmations, count(c.user_id) >= 10 as active
 from public.community_entries e left join public.community_confirmations c on c.entry_id=e.id
 group by e.id;
grant select on public.community_feed to authenticated;
create function public.submit_community(p_park text,p_kind text,p_title text,p_body text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare result uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 if (select count(*) from public.community_entries where author_id=auth.uid() and created_at > now()-interval '1 day') >= 10 then
  raise exception 'Daily submission limit';
 end if;
 insert into public.community_entries(park_id,author_id,kind,title,body)
 values(p_park,auth.uid(),p_kind,btrim(p_title),btrim(p_body)) returning id into result;
 return result;
end $$;
create function public.confirm_community(p_entry uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if not exists(select 1 from public.community_entries where id=p_entry and author_id <> auth.uid()) then
  raise exception 'Cannot confirm own or missing entry';
 end if;
 insert into public.community_confirmations(entry_id,user_id) values(p_entry,auth.uid()) on conflict do nothing;
end $$;
revoke all on function public.submit_community(text,text,text,text), public.confirm_community(uuid) from public,anon;
grant execute on function public.submit_community(text,text,text,text), public.confirm_community(uuid) to authenticated;
commit;
