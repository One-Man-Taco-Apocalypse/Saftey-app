-- Each user's crew: a list of the uids of the people on it.

alter table public.user_settings
  add column if not exists crew_members uuid[] not null default '{}';

-- Everyone a user can pick for their crew.
-- Users can't read other people's user_settings rows directly (that would expose
-- their favorites etc.), so this function returns only the public bits.
create or replace function public.list_people()
returns table (user_id uuid, first_name text, last_name text, color text, email text)
language sql
stable
security definer
set search_path = ''
as $$
  select s.user_id, s.first_name, s.last_name, s.color, u.email::text
  from public.user_settings s
  join auth.users u on u.id = s.user_id
  where auth.uid() is not null -- signed-in users only
  order by s.first_name nulls last, s.last_name nulls last, u.email;
$$;

revoke execute on function public.list_people() from public, anon;
grant execute on function public.list_people() to authenticated;

-- Make sure the API notices the changes straight away.
notify pgrst, 'reload schema';
