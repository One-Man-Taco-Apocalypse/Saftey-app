-- Per-user settings. One row per user, keyed by their auth uid.

-- 1. The table
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  -- Random color for now: '#' + 6 random hex digits, e.g. '#3fa2c9'
  color text not null
    default '#' || lpad(to_hex(floor(random() * 16777216)::int), 6, '0')
    check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Security: each user can only read and change their own row
alter table public.user_settings enable row level security;

drop policy if exists "Users read own settings" on public.user_settings;
create policy "Users read own settings"
  on public.user_settings for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users update own settings" on public.user_settings;
create policy "Users update own settings"
  on public.user_settings for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- 3. New users: automatically create their row when they sign up
create or replace function public.handle_new_user_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_settings on auth.users;
create trigger on_auth_user_created_settings
  after insert on auth.users
  for each row execute function public.handle_new_user_settings();

-- 4. Existing users: create a row for anyone who doesn't have one yet
insert into public.user_settings (user_id)
select id from auth.users
on conflict (user_id) do nothing;
