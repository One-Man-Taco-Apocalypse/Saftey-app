-- Project workforce: the foremen working on a project and each one's crew,
-- for the "My project" dashboard tab.
--
-- A foreman is on a project when EITHER
--   * their position is Foreman and they've set the project as their current
--     project (on their dashboard), OR
--   * they're assigned a role containing "Foreman" on the project
--     (Admin > Edit projects > Project roles).
-- Their crew is the crew they've picked on their dashboard.
--
-- Each user's settings (current project, crew) are private, so this function
-- runs with elevated rights and returns ONLY who is on which crew; nothing else
-- from user_settings. Signed-in users only. Safe to re-run.

create or replace function public.project_workforce(p_job_number text)
returns table (foreman_id uuid, member_id uuid, member_order int)
language sql
stable
security definer
set search_path = ''
as $$
  with foremen as (
    select s.user_id
    from public.user_settings s
    join public.profiles p on p.user_id = s.user_id
    where s.current_project = p_job_number
      and p.position = 'Foreman'
    union
    select r.user_id
    from public.project_roles r
    where r.job_number = p_job_number
      and r.user_id is not null
      and r.position ilike '%foreman%'
  )
  -- One row per crew member; a foreman with no crew gets one row with no member
  select f.user_id, c.member_id, c.ord::int
  from foremen f
  left join public.user_settings s on s.user_id = f.user_id
  left join lateral (
    select m.member_id, m.ord
    from unnest(coalesce(s.crew_members, '{}')) with ordinality as m(member_id, ord)
    join public.profiles mp on mp.user_id = m.member_id -- still has an account
    where m.member_id <> f.user_id
  ) c on true
  where (select auth.uid()) is not null;
$$;

revoke execute on function public.project_workforce(text) from public, anon;
grant execute on function public.project_workforce(text) to authenticated;

notify pgrst, 'reload schema';
