-- Documents: templates (the forms), their versions, and submitted documents.
--
--   document_templates           one row per form, e.g. "Toolbox Talk"
--   document_template_versions   the form's fields; a new row every time it's edited
--   document_submissions         every filled-in document, for every form and job
--
-- Fields are stored as a JSON list, e.g.
--   [
--     {"id": "topic",   "type": "text",     "label": "Topic",          "required": true},
--     {"id": "ppe",     "type": "checkbox", "label": "PPE checked"},
--     {"id": "weather", "type": "select",   "label": "Weather", "options": ["Clear", "Rain", "Snow"]}
--   ]
-- Answers are stored as JSON keyed by field id, e.g.
--   {"topic": "Ladder safety", "ppe": true, "weather": "Clear"}

-- Keeps updated_at current whenever a row changes
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- 1. Templates ---------------------------------------------------------------

create table if not exists public.document_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  description text,
  archived boolean not null default false, -- hide instead of deleting
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists document_templates_updated_at on public.document_templates;
create trigger document_templates_updated_at
  before update on public.document_templates
  for each row execute function public.set_updated_at();


-- 2. Template versions -------------------------------------------------------
-- Never edited or deleted, so old submissions always show the exact form
-- the worker filled in. The latest version is the one with the highest number.

create table if not exists public.document_template_versions (
  template_id uuid not null references public.document_templates(id) on delete cascade,
  version int not null check (version > 0),
  fields jsonb not null default '[]' check (jsonb_typeof(fields) = 'array'),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (template_id, version)
);

-- Save a template's fields as its next version. Returns the new version number.
-- Use this from the app instead of inserting versions directly.
create or replace function public.save_template_version(p_template_id uuid, p_fields jsonb)
returns int
language plpgsql
security invoker -- runs as the user, so the security rules below still apply
set search_path = ''
as $$
declare
  next_version int;
begin
  -- lock the template so two saves at once can't get the same number
  perform 1 from public.document_templates where id = p_template_id for update;

  select coalesce(max(version), 0) + 1 into next_version
  from public.document_template_versions
  where template_id = p_template_id;

  insert into public.document_template_versions (template_id, version, fields)
  values (p_template_id, next_version, p_fields);

  update public.document_templates set updated_at = now() where id = p_template_id;
  return next_version;
end;
$$;


-- 3. Submitted documents -----------------------------------------------------

create table if not exists public.document_submissions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null,
  template_version int not null,
  job_number text references public.projects(job_number) on update cascade,
  submitted_by uuid default auth.uid() references auth.users(id) on delete set null,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  answers jsonb not null default '{}' check (jsonb_typeof(answers) = 'object'),
  -- Keyword search over the typed answers (not field names). Updates itself.
  search tsvector generated always as (
    jsonb_to_tsvector('english', answers, '["string"]')
  ) stored,
  -- Must point at a real version of the form; can't delete a version that's been used
  foreign key (template_id, template_version)
    references public.document_template_versions(template_id, version)
);

drop trigger if exists document_submissions_updated_at on public.document_submissions;
create trigger document_submissions_updated_at
  before update on public.document_submissions
  for each row execute function public.set_updated_at();

-- Fast lookups: "this form on this job", "this job, newest first", "by person", keywords
create index if not exists document_submissions_template_job_idx
  on public.document_submissions (template_id, job_number);
create index if not exists document_submissions_job_date_idx
  on public.document_submissions (job_number, submitted_at desc);
create index if not exists document_submissions_submitted_by_idx
  on public.document_submissions (submitted_by);
create index if not exists document_submissions_search_idx
  on public.document_submissions using gin (search);


-- 4. Security ----------------------------------------------------------------
-- For now every signed-in user can see and create templates and submissions.
-- Once there are roles (admin / supervisor / worker) these should be tightened.

alter table public.document_templates enable row level security;
alter table public.document_template_versions enable row level security;
alter table public.document_submissions enable row level security;

-- Templates: read, create, edit (archive instead of delete)
drop policy if exists "Signed-in users read templates" on public.document_templates;
create policy "Signed-in users read templates"
  on public.document_templates for select to authenticated using (true);

drop policy if exists "Signed-in users create templates" on public.document_templates;
create policy "Signed-in users create templates"
  on public.document_templates for insert to authenticated
  with check ((select auth.uid()) = created_by);

drop policy if exists "Signed-in users edit templates" on public.document_templates;
create policy "Signed-in users edit templates"
  on public.document_templates for update to authenticated using (true);

-- Versions: read and add new ones only (never edit or delete)
drop policy if exists "Signed-in users read template versions" on public.document_template_versions;
create policy "Signed-in users read template versions"
  on public.document_template_versions for select to authenticated using (true);

drop policy if exists "Signed-in users add template versions" on public.document_template_versions;
create policy "Signed-in users add template versions"
  on public.document_template_versions for insert to authenticated
  with check ((select auth.uid()) = created_by);

-- Submissions: everyone can read; you can submit as yourself and edit your own
drop policy if exists "Signed-in users read submissions" on public.document_submissions;
create policy "Signed-in users read submissions"
  on public.document_submissions for select to authenticated using (true);

drop policy if exists "Users submit as themselves" on public.document_submissions;
create policy "Users submit as themselves"
  on public.document_submissions for insert to authenticated
  with check ((select auth.uid()) = submitted_by);

drop policy if exists "Users edit own submissions" on public.document_submissions;
create policy "Users edit own submissions"
  on public.document_submissions for update to authenticated
  using ((select auth.uid()) = submitted_by)
  with check ((select auth.uid()) = submitted_by);

grant select, insert, update on table public.document_templates to authenticated;
grant select, insert on table public.document_template_versions to authenticated;
grant select, insert, update on table public.document_submissions to authenticated;

revoke execute on function public.save_template_version(uuid, jsonb) from public, anon;
grant execute on function public.save_template_version(uuid, jsonb) to authenticated;


-- 5. A sample template to test with ------------------------------------------

insert into public.document_templates (id, name, description, created_by)
values (
  '00000000-0000-0000-0000-00000000d0c1',
  'Toolbox Talk',
  'Daily pre-shift safety meeting',
  null
)
on conflict (id) do nothing;

insert into public.document_template_versions (template_id, version, fields, created_by)
values (
  '00000000-0000-0000-0000-00000000d0c1',
  1,
  '[
    {"id": "topic",       "type": "text",     "label": "Topic",                  "required": true},
    {"id": "date",        "type": "date",     "label": "Date",                   "required": true},
    {"id": "weather",     "type": "select",   "label": "Weather",                "options": ["Clear", "Cloudy", "Rain", "Snow", "Wind"]},
    {"id": "hazards",     "type": "textarea", "label": "Hazards discussed"},
    {"id": "ppe_checked", "type": "checkbox", "label": "PPE checked for all crew"}
  ]'::jsonb,
  null
)
on conflict (template_id, version) do nothing;

notify pgrst, 'reload schema';
