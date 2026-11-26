-- Projects (jobs). The job number identifies each project.

create table if not exists public.projects (
  job_number text primary key,
  job_name text not null
);

-- Security: any signed-in user can see projects.
-- Nobody can add/change/delete them from the app yet; do that in the Supabase dashboard.
alter table public.projects enable row level security;

drop policy if exists "Signed-in users read projects" on public.projects;
create policy "Signed-in users read projects"
  on public.projects for select
  to authenticated
  using (true);

grant select on table public.projects to authenticated;

-- Starting projects
insert into public.projects (job_number, job_name) values
  ('SFJ6901B01', 'power co FA1'),
  ('SFJ6901B02', 'powerco CP1')
on conflict (job_number) do nothing;
