-- Everything the site needs in a new Supabase project. Run it once in the SQL editor, then create the owner's account
-- under Authentication > Users and put the project's address and publishable key in config.js.
-- Turning off new sign-ups (Authentication > Sign In / Providers > "Allow new users to sign up") is still a good idea:
-- the site has one owner. The rule at the end of this file keeps any second account from saving anything.
-- The site is for one owner: visitors who are not signed in can read the owner's checkmarks and the "home" part of the
-- content, and nothing else.

-- Checkmarks, edits and notes made on the site.
create table if not exists public.roadmap_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  checks jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.roadmap_progress enable row level security;
revoke all on public.roadmap_progress from anon;
grant select on public.roadmap_progress to anon;
grant select, insert, update, delete on public.roadmap_progress to authenticated;
create policy "own row only" on public.roadmap_progress for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "public can read owner progress" on public.roadmap_progress for select to anon using (true);

-- The site's content. The owner's row "content" holds all of it; the row "home" is made from it by the database
-- and holds only what the Home page shows, which is the one row a visitor (not signed in) may read.
create table if not exists public.roadmap_content (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  part text not null check (part in ('content', 'home')),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, part)
);
alter table public.roadmap_content enable row level security;
revoke all on public.roadmap_content from anon;
grant select on public.roadmap_content to anon;
grant select, insert, update, delete on public.roadmap_content to authenticated;
create policy "owner reads and writes own content" on public.roadmap_content for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "anyone can read the home part" on public.roadmap_content for select to anon using (part = 'home');

-- What Home shows: dates, tasks, the month and weeks, application names and stages, and class codes for the progress ring.
-- Left out: class details and meeting times, project write-ups and links, the Drive link, certifications, targets, the
-- portfolio plan, places to look for internships, study guides and the setup checklist.
create or replace function public.roadmap_home(c jsonb) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'schema', c->'schema', 'school', c->'school', 'areas', c->'areas', 'kinds', c->'kinds', 'done', c->'done', 'todo', c->'todo',
    'months', c->'months', 'weeks', c->'weeks', 'checkin', c->'checkin', 'credit', c->'credit', 'reqs', c->'reqs',
    'socials', (select jsonb_agg(s order by n) from jsonb_array_elements(case when jsonb_typeof(c->'socials') = 'array' then c->'socials' else '[]'::jsonb end) with ordinality as x(s, n) where s->>0 <> 'drive'),
    'terms', (select jsonb_agg(t - 'classes' order by n) from jsonb_array_elements(case when jsonb_typeof(c->'terms') = 'array' then c->'terms' else '[]'::jsonb end) with ordinality as x(t, n)),
    'apps', (select jsonb_agg(jsonb_build_object('id', a->'id', 'kind', a->'kind', 'org', a->'org', 'role', a->'role', 'status', a->'status', 'due', a->'due') order by n)
             from jsonb_array_elements(case when jsonb_typeof(c->'apps') = 'array' then c->'apps' else '[]'::jsonb end) with ordinality as x(a, n)),
    'works', (select jsonb_agg(jsonb_build_object('id', w->'id', 'kind', w->'kind', 'status', w->'status', 'plan', w->'plan', 'start', w->'start', 'exp', w->'exp') order by n)
              from jsonb_array_elements(case when jsonb_typeof(c->'works') = 'array' then c->'works' else '[]'::jsonb end) with ordinality as x(w, n)),
    'projects', (select jsonb_agg(jsonb_build_object('id', p->'id') order by n)
                 from jsonb_array_elements(case when jsonb_typeof(c->'projects') = 'array' then c->'projects' else '[]'::jsonb end) with ordinality as x(p, n)),
    'later', case when jsonb_typeof(c->'later'->'years') = 'array' then jsonb_build_object('years', (
      select coalesce(jsonb_agg(jsonb_build_object('year', y->'year', 'quarters', (
        select coalesce(jsonb_agg(jsonb_build_object('q', q->'q', 'courses', (
          select coalesce(jsonb_agg(jsonb_build_object('code', k->'code', 'title', k->'title', 'units', k->'units') order by kn), '[]'::jsonb)
          from jsonb_array_elements(case when jsonb_typeof(q->'courses') = 'array' then q->'courses' else '[]'::jsonb end) with ordinality as z(k, kn))) order by qn), '[]'::jsonb)
        from jsonb_array_elements(case when jsonb_typeof(y->'quarters') = 'array' then y->'quarters' else '[]'::jsonb end) with ordinality as z(q, qn))) order by yn), '[]'::jsonb)
      from jsonb_array_elements(c->'later'->'years') with ordinality as z(y, yn))) end
  ))
$$;
revoke execute on function public.roadmap_home(jsonb) from public, anon;
grant execute on function public.roadmap_home(jsonb) to authenticated;

-- Every write stamps the time, so the site can tell its copy is out of date; a write to "content" remakes "home".
create or replace function public.roadmap_content_touch() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
create or replace function public.roadmap_content_home() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.part = 'content' then
    insert into public.roadmap_content (user_id, part, data) values (new.user_id, 'home', public.roadmap_home(new.data))
    on conflict (user_id, part) do update set data = excluded.data;
  end if;
  return null;
end $$;
revoke execute on function public.roadmap_content_touch() from public, anon;
revoke execute on function public.roadmap_content_home() from public, anon;
create trigger roadmap_content_touch before insert or update on public.roadmap_content for each row execute function public.roadmap_content_touch();
create trigger roadmap_content_home after insert or update on public.roadmap_content for each row execute function public.roadmap_content_home();

-- Study guide progress: one row per guide, readable and writable only by its owner.
create table if not exists public.study_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  guide_id text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, guide_id)
);
alter table public.study_progress enable row level security;
revoke all on public.study_progress from anon;
grant select, insert, update on public.study_progress to authenticated;
create policy "owner reads study progress" on public.study_progress for select to authenticated using ((select auth.uid()) = user_id);
create policy "owner inserts study progress" on public.study_progress for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "owner updates study progress" on public.study_progress for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- One owner: once an account has saved something, no other account can add rows. A second account, if one is ever
-- made, can sign in but saves nothing, so what visitors are shown is always the owner's.
create or replace function public.roadmap_one_owner() returns trigger language plpgsql security definer set search_path = '' as $$
declare taken boolean;
begin
  execute format('select exists (select 1 from %I.%I where user_id <> $1)', tg_table_schema, tg_table_name) into taken using new.user_id;
  if taken then raise exception 'This site already has an owner.' using errcode = '42501'; end if;
  return new;
end $$;
revoke execute on function public.roadmap_one_owner() from public, anon, authenticated;
create trigger roadmap_progress_one_owner before insert on public.roadmap_progress for each row execute function public.roadmap_one_owner();
create trigger roadmap_content_one_owner before insert on public.roadmap_content for each row execute function public.roadmap_one_owner();
create trigger study_progress_one_owner before insert on public.study_progress for each row execute function public.roadmap_one_owner();
