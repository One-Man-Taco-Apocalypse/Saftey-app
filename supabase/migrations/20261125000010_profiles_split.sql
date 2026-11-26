-- Split user_settings into two tables:
--
--   profiles        what coworkers can see: name, color, position, temp_user
--   user_settings   private to each user: current project, favorites, crew,
--                   plus a `preferences` JSON column for small UI settings
--
-- Existing data is copied into profiles before the old columns are removed.
-- Safe to re-run.

-- 1. The profiles table --------------------------------------------------------

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  color text not null
    default '#' || lpad(to_hex(floor(random() * 16777216)::int), 6, '0')
    check (color ~ '^#[0-9a-fA-F]{6}$'),
  position text check (position in ('Journeyman', 'Apprentice')),
  temp_user boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();


-- 2. Move the data across (one block, so it either all happens or none of it) ----

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'user_settings' and column_name = 'first_name'
  ) then
    insert into public.profiles (user_id, first_name, last_name, color, position, temp_user, created_at)
    select user_id, first_name, last_name, color, position, temp_user, created_at
    from public.user_settings
    on conflict (user_id) do nothing;

    alter table public.user_settings
      drop column first_name,
      drop column last_name,
      drop column color,
      drop column position,
      drop column temp_user;
  end if;
end $$;

-- Anyone with a login but no profile yet gets one
insert into public.profiles (user_id)
select id from auth.users
on conflict (user_id) do nothing;


-- 3. Private settings: add preferences ------------------------------------------
-- e.g. {"theme": "dark", "sidebarPinned": true}. New keys need no database change.

alter table public.user_settings
  add column if not exists preferences jsonb not null default '{}'
    check (jsonb_typeof(preferences) = 'object');

drop trigger if exists user_settings_updated_at on public.user_settings;
create trigger user_settings_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();


-- 4. New sign-ups get both rows ---------------------------------------------------

create or replace function public.handle_new_user_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, first_name, last_name)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'first_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'last_name'), '')
  )
  on conflict (user_id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;


-- 5. Security -----------------------------------------------------------------------
-- profiles: every signed-in user can see everyone's profile (for crews etc.).
-- Users can edit only their own name and color; position and temp_user are
-- set by an admin in the Supabase dashboard.

alter table public.profiles enable row level security;

drop policy if exists "Signed-in users read profiles" on public.profiles;
create policy "Signed-in users read profiles"
  on public.profiles for select to authenticated using (true);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select on table public.profiles to authenticated;
grant update (first_name, last_name, color) on table public.profiles to authenticated;

-- user_settings keeps its existing rules: each user reads/updates only their own row.


-- 6. People list for the crew picker now reads from profiles ------------------------

drop function if exists public.list_people();
create function public.list_people()
returns table (user_id uuid, first_name text, last_name text, color text, email text, "position" text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.user_id, p.first_name, p.last_name, p.color, u.email::text, p.position
  from public.profiles p
  join auth.users u on u.id = p.user_id
  where auth.uid() is not null -- signed-in users only
  order by p.first_name nulls last, p.last_name nulls last, u.email;
$$;

revoke execute on function public.list_people() from public, anon;
grant execute on function public.list_people() to authenticated;

notify pgrst, 'reload schema';

-- To delete all the temp workers now:
--   delete from auth.users where id in (select user_id from public.profiles where temp_user);
