-- Add first and last name to user_settings.

alter table public.user_settings
  add column if not exists first_name text,
  add column if not exists last_name text;

-- New users: copy the names typed on the sign-up form into their row.
-- (The sign-up form sends them as first_name / last_name in the user's metadata.)
create or replace function public.handle_new_user_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_settings (user_id, first_name, last_name)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'first_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'last_name'), '')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- Existing users: fill in names from their metadata if they have any.
update public.user_settings s
set
  first_name = coalesce(s.first_name, nullif(trim(u.raw_user_meta_data ->> 'first_name'), '')),
  last_name  = coalesce(s.last_name,  nullif(trim(u.raw_user_meta_data ->> 'last_name'), ''))
from auth.users u
where u.id = s.user_id;
