-- Map coordinates for a project (decimal degrees, e.g. 43.6532, -79.3832).
-- Set on Admin > Edit projects together with the address. Both or neither.
-- Needs 20261126000023_project_details.sql first. Safe to re-run.

alter table public.projects
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

alter table public.projects drop constraint if exists projects_coordinates_valid;
alter table public.projects
  add constraint projects_coordinates_valid check (
    (latitude is null) = (longitude is null)
    and (latitude is null or latitude between -90 and 90)
    and (longitude is null or longitude between -180 and 180)
  );

grant update (latitude, longitude) on table public.projects to authenticated;

-- Same function as in 23, now also saving p_address.latitude / .longitude
-- (numbers or numeric text; blank = cleared).
create or replace function public.save_project_details(
  p_job_number text,
  p_address jsonb,
  p_roles jsonb default '[]'::jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if jsonb_typeof(coalesce(p_roles, '[]'::jsonb)) <> 'array' then
    raise exception 'p_roles must be a JSON array' using errcode = 'invalid_parameter_value';
  end if;

  update public.projects set
    address_street      = nullif(btrim(p_address ->> 'street'), ''),
    address_unit        = nullif(btrim(p_address ->> 'unit'), ''),
    address_city        = nullif(btrim(p_address ->> 'city'), ''),
    address_province    = nullif(btrim(p_address ->> 'province'), ''),
    address_postal_code = nullif(upper(btrim(p_address ->> 'postal_code')), ''),
    address_country     = nullif(btrim(p_address ->> 'country'), ''),
    latitude            = nullif(btrim(p_address ->> 'latitude'), '')::double precision,
    longitude           = nullif(btrim(p_address ->> 'longitude'), '')::double precision
  where job_number = p_job_number;

  if not found then
    raise exception 'Project % not found', p_job_number using errcode = 'no_data_found';
  end if;

  delete from public.project_roles where job_number = p_job_number;

  insert into public.project_roles (job_number, position, user_id, sort_order)
  select
    p_job_number,
    btrim(r ->> 'position'),
    nullif(r ->> 'user_id', '')::uuid,
    (ord - 1)::int
  from jsonb_array_elements(coalesce(p_roles, '[]'::jsonb)) with ordinality as t(r, ord);
end;
$$;

revoke execute on function public.save_project_details(text, jsonb, jsonb) from public, anon;
grant execute on function public.save_project_details(text, jsonb, jsonb) to authenticated;

notify pgrst, 'reload schema';
