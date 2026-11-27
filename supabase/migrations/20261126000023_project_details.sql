-- Project details, edited on Admin > Edit projects:
--   * the project's address (columns on public.projects)
--   * project roles: who fills which position on a project (public.project_roles)
--
-- Saved together with save_project_details() (all or nothing).
--
-- Who can edit: ANY signed-in user, for now. The app has no admin role yet;
-- when it does, tighten the two "edit" policies below (and the grant on
-- projects) to admins only.
--
-- Safe to re-run.

-- 1. Address -------------------------------------------------------------------------

alter table public.projects
  add column if not exists address_street text,
  add column if not exists address_unit text,
  add column if not exists address_city text,
  add column if not exists address_province text,
  add column if not exists address_postal_code text,
  add column if not exists address_country text;

-- Editing: only the address columns (job number / name stay dashboard-only)
drop policy if exists "Signed-in users edit project details" on public.projects;
create policy "Signed-in users edit project details"
  on public.projects for update to authenticated
  using (true)
  with check (true);

grant update (
  address_street, address_unit, address_city,
  address_province, address_postal_code, address_country
) on table public.projects to authenticated;


-- 2. Project roles -------------------------------------------------------------------

create table if not exists public.project_roles (
  id uuid primary key default gen_random_uuid(),
  job_number text not null
    references public.projects(job_number) on delete cascade on update cascade,
  position text not null
    constraint project_roles_position_length check (char_length(btrim(position)) between 1 and 80),
  user_id uuid references auth.users(id) on delete set null, -- null = nobody assigned yet
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Foreign keys are indexed (Postgres doesn't do it automatically)
create index if not exists project_roles_job_number_idx
  on public.project_roles (job_number, sort_order);
create index if not exists project_roles_user_id_idx
  on public.project_roles (user_id);

alter table public.project_roles enable row level security;

drop policy if exists "Signed-in users read project roles" on public.project_roles;
create policy "Signed-in users read project roles"
  on public.project_roles for select to authenticated
  using (true);

drop policy if exists "Signed-in users edit project roles" on public.project_roles;
create policy "Signed-in users edit project roles"
  on public.project_roles for all to authenticated
  using (true)
  with check (true);

-- New tables aren't exposed to the Data API automatically
revoke all on table public.project_roles from anon, authenticated;
grant select, insert, update, delete on table public.project_roles to authenticated;


-- 3. Save address + roles together ---------------------------------------------------
-- p_address: {"street": "...", "unit": "...", "city": "...", "province": "...",
--             "postal_code": "...", "country": "..."}   (blank = cleared)
-- p_roles:   [{"position": "Foreman", "user_id": "<uuid or null>"}, ...]  (in order)
-- The project's roles are replaced by p_roles. Runs as the caller, so RLS applies.

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
    address_country     = nullif(btrim(p_address ->> 'country'), '')
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
