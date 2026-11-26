-- Adds `position` and `temp_user` to user_settings, and creates 25 fake
-- workers (temp_user = true) for testing.
--
-- Every user_settings row must belong to a login in auth.users, so this creates
-- 25 logins with no password (nobody can sign in as them). The existing sign-up
-- trigger then gives each one a user_settings row with a random color.
--
-- (After 20261125000010_profiles_split.sql these columns live in public.profiles.)
-- To delete all the fake workers later, run:
--   delete from auth.users
--   where id in (select user_id from public.user_settings where temp_user);

-- 1. New columns
alter table public.user_settings
  add column if not exists position text
    check (position in ('Journeyman', 'Apprentice')),
  add column if not exists temp_user boolean not null default false;

-- 2. The fake workers
-- Done as one block so it works in the Supabase SQL Editor.
-- Safe to re-run: workers that already exist are just updated.
do $$
declare
  w record;
  worker_email text;
  worker_id uuid;
begin
  for w in
    select * from (values
      ('Lucas', 'Dawson', 'Journeyman'),
      ('Ethan', 'Hughes', 'Apprentice'),
      ('Jack', 'Underwood', 'Journeyman'),
      ('Hunter', 'Douglas', 'Journeyman'),
      ('Noah', 'Sinclair', 'Journeyman'),
      ('Olivia', 'Brooks', 'Journeyman'),
      ('Evelyn', 'Bennett', 'Apprentice'),
      ('Emma', 'Young', 'Apprentice'),
      ('Mia', 'MacDonald', 'Apprentice'),
      ('Caleb', 'Zimmerman', 'Apprentice'),
      ('Grace', 'Fischer', 'Apprentice'),
      ('Wyatt', 'Carter', 'Apprentice'),
      ('Mason', 'Reid', 'Apprentice'),
      ('Abigail', 'Ellis', 'Journeyman'),
      ('Tyler', 'Jensen', 'Journeyman'),
      ('Chloe', 'Grant', 'Journeyman'),
      ('Owen', 'Campbell', 'Journeyman'),
      ('Dylan', 'Irving', 'Apprentice'),
      ('Nathan', 'Walsh', 'Apprentice'),
      ('Zoe', 'Parker', 'Apprentice'),
      ('Logan', 'Quinn', 'Apprentice'),
      ('Amelia', 'Vasquez', 'Apprentice'),
      ('Liam', 'Nguyen', 'Journeyman'),
      ('Isabella', 'Anderson', 'Journeyman'),
      ('Carter', 'Kowalski', 'Apprentice')
    ) as t(first_name, last_name, worker_position)
  loop
    worker_email := lower(w.first_name || '.' || w.last_name) || '@temp-worker.example.com';

    select id into worker_id from auth.users where email = worker_email;

    if worker_id is null then
      worker_id := gen_random_uuid();
      -- Creating the login fires the sign-up trigger, which makes their
      -- user_settings row (random color + name).
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change
      ) values (
        '00000000-0000-0000-0000-000000000000', worker_id, 'authenticated', 'authenticated',
        worker_email, '',
        now(), '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('first_name', w.first_name, 'last_name', w.last_name),
        now(), now(),
        '', '', '', ''
      );
    end if;

    -- Make sure they have a settings row, then set position + temp flag
    insert into public.user_settings (user_id, first_name, last_name)
    values (worker_id, w.first_name, w.last_name)
    on conflict (user_id) do nothing;

    update public.user_settings
    set position = w.worker_position,
        temp_user = true
    where user_id = worker_id;
  end loop;
end $$;

-- 3. Include position in the people list used by the crew picker
drop function if exists public.list_people();
create function public.list_people()
returns table (user_id uuid, first_name text, last_name text, color text, email text, "position" text) -- quoted: position is a reserved word here
language sql
stable
security definer
set search_path = ''
as $$
  select s.user_id, s.first_name, s.last_name, s.color, u.email::text, s.position
  from public.user_settings s
  join auth.users u on u.id = s.user_id
  where auth.uid() is not null -- signed-in users only
  order by s.first_name nulls last, s.last_name nulls last, u.email;
$$;

revoke execute on function public.list_people() from public, anon;
grant execute on function public.list_people() to authenticated;

notify pgrst, 'reload schema';
