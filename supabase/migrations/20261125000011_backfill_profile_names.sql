-- Fill in any missing first/last names in profiles from the details each user
-- (or temp worker) was created with. Only fills blanks; never overwrites a name.

update public.profiles p
set
  first_name = coalesce(p.first_name, nullif(trim(u.raw_user_meta_data ->> 'first_name'), '')),
  last_name  = coalesce(p.last_name,  nullif(trim(u.raw_user_meta_data ->> 'last_name'), ''))
from auth.users u
where u.id = p.user_id
  and (p.first_name is null or p.last_name is null);

-- Show who still has no name (fill these in via Table Editor -> profiles)
select p.user_id, u.email, p.first_name, p.last_name, p.position
from public.profiles p
join auth.users u on u.id = p.user_id
where p.first_name is null or p.last_name is null;
