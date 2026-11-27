-- TEST DATA: 6 crews on "power co FA1" (job SFJ6901B01).
--
-- Run once in the Supabase SQL editor. Safe to re-run (same result each time).
--
--   * 6 fake foremen (position Foreman), each with power co FA1 as their
--     active project, so they show on "My project > Project workforce"
--   * 46 fake workers: the 25 from 20261124000006_positions_temp_workers.sql
--     (created here if missing) plus 21 new ones
--   * crews of 8, 5, 11, 6, 12 and 4 workers; nobody is on two crews
--
-- Like the earlier fake workers, these are logins with no password (nobody can
-- sign in as them), marked temp_user = true. Undo: see the bottom of this file.

do $$
declare
  job constant text := 'SFJ6901B01'; -- power co FA1
  crew_sizes constant int[] := array[8, 5, 11, 6, 12, 4];
  p record;
  v_email text;
  v_id uuid;
  f record;
  taken int := 0;
begin
  if not exists (select 1 from public.projects where job_number = job) then
    raise exception 'Project % (power co FA1) not found', job;
  end if;

  create temp table seed_people (
    ord int primary key,
    kind text not null,          -- 'foreman' or 'worker'
    first_name text not null,
    last_name text not null,
    worker_position text,        -- for workers created here
    user_id uuid
  ) on commit drop;

  insert into seed_people (ord, kind, first_name, last_name, worker_position) values
    -- Foremen (one per crew, in crew order)
    (1, 'foreman', 'Dave', 'Thompson', null),
    (2, 'foreman', 'Mike', 'Robertson', null),
    (3, 'foreman', 'Sarah', 'Morin', null),
    (4, 'foreman', 'Kevin', 'Chen', null),
    (5, 'foreman', 'Jessica', 'Lefebvre', null),
    (6, 'foreman', 'Tom', 'Harrison', null),
    -- The 25 existing fake workers
    (101, 'worker', 'Lucas', 'Dawson', 'Journeyman'),
    (102, 'worker', 'Ethan', 'Hughes', 'Apprentice'),
    (103, 'worker', 'Jack', 'Underwood', 'Journeyman'),
    (104, 'worker', 'Hunter', 'Douglas', 'Journeyman'),
    (105, 'worker', 'Noah', 'Sinclair', 'Journeyman'),
    (106, 'worker', 'Olivia', 'Brooks', 'Journeyman'),
    (107, 'worker', 'Evelyn', 'Bennett', 'Apprentice'),
    (108, 'worker', 'Emma', 'Young', 'Apprentice'),
    (109, 'worker', 'Mia', 'MacDonald', 'Apprentice'),
    (110, 'worker', 'Caleb', 'Zimmerman', 'Apprentice'),
    (111, 'worker', 'Grace', 'Fischer', 'Apprentice'),
    (112, 'worker', 'Wyatt', 'Carter', 'Apprentice'),
    (113, 'worker', 'Mason', 'Reid', 'Apprentice'),
    (114, 'worker', 'Abigail', 'Ellis', 'Journeyman'),
    (115, 'worker', 'Tyler', 'Jensen', 'Journeyman'),
    (116, 'worker', 'Chloe', 'Grant', 'Journeyman'),
    (117, 'worker', 'Owen', 'Campbell', 'Journeyman'),
    (118, 'worker', 'Dylan', 'Irving', 'Apprentice'),
    (119, 'worker', 'Nathan', 'Walsh', 'Apprentice'),
    (120, 'worker', 'Zoe', 'Parker', 'Apprentice'),
    (121, 'worker', 'Logan', 'Quinn', 'Apprentice'),
    (122, 'worker', 'Amelia', 'Vasquez', 'Apprentice'),
    (123, 'worker', 'Liam', 'Nguyen', 'Journeyman'),
    (124, 'worker', 'Isabella', 'Anderson', 'Journeyman'),
    (125, 'worker', 'Carter', 'Kowalski', 'Apprentice'),
    -- 21 new workers
    (126, 'worker', 'Ryan', 'Mitchell', 'Journeyman'),
    (127, 'worker', 'Sophie', 'Tremblay', 'Apprentice'),
    (128, 'worker', 'Brandon', 'Lavoie', 'Journeyman'),
    (129, 'worker', 'Hannah', 'Gagnon', 'Apprentice'),
    (130, 'worker', 'Connor', 'Roy', 'Journeyman'),
    (131, 'worker', 'Ava', 'Bouchard', 'Apprentice'),
    (132, 'worker', 'Austin', 'Fraser', 'Journeyman'),
    (133, 'worker', 'Lily', 'Morrison', 'Apprentice'),
    (134, 'worker', 'Cole', 'Stewart', 'Journeyman'),
    (135, 'worker', 'Ella', 'Ferguson', 'Apprentice'),
    (136, 'worker', 'Jordan', 'Patel', 'Journeyman'),
    (137, 'worker', 'Madison', 'Singh', 'Apprentice'),
    (138, 'worker', 'Evan', 'Murphy', 'Journeyman'),
    (139, 'worker', 'Avery', 'Kelly', 'Apprentice'),
    (140, 'worker', 'Luke', 'Gauthier', 'Journeyman'),
    (141, 'worker', 'Nora', 'Ross', 'Apprentice'),
    (142, 'worker', 'Gavin', 'Hamilton', 'Journeyman'),
    (143, 'worker', 'Leah', 'Graham', 'Apprentice'),
    (144, 'worker', 'Isaac', 'Mackenzie', 'Journeyman'),
    (145, 'worker', 'Claire', 'Wong', 'Apprentice'),
    (146, 'worker', 'Max', 'Leblanc', 'Journeyman');

  -- 1. Make sure everyone exists (creating the login makes their profile and
  --    settings rows through the sign-up trigger), then set name + position.
  for p in select * from seed_people order by ord loop
    v_email := lower(p.first_name || '.' || p.last_name) || '@temp-worker.example.com';
    select id into v_id from auth.users where email = v_email;

    if v_id is null then
      v_id := gen_random_uuid();
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change
      ) values (
        '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
        v_email, '',
        now(), '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('first_name', p.first_name, 'last_name', p.last_name),
        now(), now(),
        '', '', '', ''
      );
    end if;

    -- In case the trigger didn't run for an older login
    insert into public.profiles (user_id) values (v_id) on conflict (user_id) do nothing;
    insert into public.user_settings (user_id) values (v_id) on conflict (user_id) do nothing;

    update public.profiles set
      first_name = p.first_name,
      last_name = p.last_name,
      temp_user = true,
      -- Foremen are Foremen; workers keep a position they already have
      position = case when p.kind = 'foreman' then 'Foreman'
                      else coalesce(position, p.worker_position) end
    where user_id = v_id;

    update seed_people set user_id = v_id where ord = p.ord;
  end loop;

  -- 2. Crews: each foreman gets the next slice of workers, and power co FA1
  --    as their active project.
  for f in select * from seed_people where kind = 'foreman' order by ord loop
    update public.user_settings set
      current_project = job,
      crew_members = coalesce((
        select array_agg(w.user_id order by w.ord)
        from (
          select user_id, ord from seed_people
          where kind = 'worker'
          order by ord
          offset taken
          limit crew_sizes[f.ord]
        ) w
      ), '{}')
    where user_id = f.user_id;
    taken := taken + crew_sizes[f.ord];
  end loop;

  raise notice 'Done: 6 crews (% workers) on power co FA1', taken;
end $$;

-- Check: each foreman, their active project and crew size
select p.first_name || ' ' || p.last_name as foreman,
       s.current_project,
       cardinality(s.crew_members) as crew_size
from public.profiles p
join public.user_settings s on s.user_id = p.user_id
join auth.users u on u.id = p.user_id
where p.position = 'Foreman' and u.email like '%@temp-worker.example.com'
order by foreman;

-- UNDO (removes the 6 foremen and the 21 new workers; the original 25 stay):
--
-- delete from auth.users where email in (
--   'dave.thompson@temp-worker.example.com', 'mike.robertson@temp-worker.example.com',
--   'sarah.morin@temp-worker.example.com', 'kevin.chen@temp-worker.example.com',
--   'jessica.lefebvre@temp-worker.example.com', 'tom.harrison@temp-worker.example.com',
--   'ryan.mitchell@temp-worker.example.com', 'sophie.tremblay@temp-worker.example.com',
--   'brandon.lavoie@temp-worker.example.com', 'hannah.gagnon@temp-worker.example.com',
--   'connor.roy@temp-worker.example.com', 'ava.bouchard@temp-worker.example.com',
--   'austin.fraser@temp-worker.example.com', 'lily.morrison@temp-worker.example.com',
--   'cole.stewart@temp-worker.example.com', 'ella.ferguson@temp-worker.example.com',
--   'jordan.patel@temp-worker.example.com', 'madison.singh@temp-worker.example.com',
--   'evan.murphy@temp-worker.example.com', 'avery.kelly@temp-worker.example.com',
--   'luke.gauthier@temp-worker.example.com', 'nora.ross@temp-worker.example.com',
--   'gavin.hamilton@temp-worker.example.com', 'leah.graham@temp-worker.example.com',
--   'isaac.mackenzie@temp-worker.example.com', 'claire.wong@temp-worker.example.com',
--   'max.leblanc@temp-worker.example.com'
-- );
