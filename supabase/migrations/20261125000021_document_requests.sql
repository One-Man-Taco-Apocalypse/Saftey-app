-- Requested documents: ask people to complete a document (e.g. a Harness
-- Inspection), from another document (e.g. a PSA).
--
--   document_requests   one row per person asked to complete one type of document
--
-- How a request is made: a checkbox field on a form can name a template to
-- request ("requestDocument": {"templateId": ...}). When it's ticked, everyone on
-- that form's signature list is asked to complete that document. The requests are
-- saved together with the document (submit_document, all or nothing).
--
-- How a request is completed: when the person submits that type of document,
-- submit_document marks all of their open requests for it as done.
--
-- Rules (enforced by the database):
--   * only the submitter of the source document can make requests from it
--   * a request is completed only by the person asked, with a document of the
--     requested type that they submitted; the time is stamped by the server
--   * once completed, a request can't be changed
--
-- Also: PSA v2, whose harness checkbox now requests a Harness Inspection.
-- Safe to re-run.

-- 1. The table -------------------------------------------------------------------

create table if not exists public.document_requests (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.document_templates(id),   -- what to complete
  requested_user_id uuid references auth.users(id) on delete cascade,     -- who
  requested_by uuid references auth.users(id) on delete set null,
  source_submission_id uuid not null,                                     -- asked from this document
  fulfilled_submission_id uuid,                                           -- completed by this document
  fulfilled_at timestamptz,
  created_at timestamptz not null default now(),
  constraint document_requests_source_fkey foreign key (source_submission_id)
    references public.document_submissions(id) on delete cascade,
  constraint document_requests_fulfilled_fkey foreign key (fulfilled_submission_id)
    references public.document_submissions(id) on delete set null,
  constraint document_requests_done_together
    check ((fulfilled_submission_id is null) = (fulfilled_at is null)),
  constraint document_requests_one_per_person
    unique (source_submission_id, template_id, requested_user_id)
);

-- "What's been asked of me / my crew?" — only open requests, so it stays small
create index if not exists document_requests_open_idx
  on public.document_requests (requested_user_id, template_id)
  where fulfilled_at is null;
create index if not exists document_requests_fulfilled_idx
  on public.document_requests (fulfilled_submission_id)
  where fulfilled_submission_id is not null;


-- 2. Guard trigger ---------------------------------------------------------------

create or replace function public.document_requests_guard()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new; -- admin / SQL editor
  end if;

  if tg_op = 'INSERT' then
    new.requested_by := (select auth.uid());
    new.created_at := now();
    new.fulfilled_submission_id := null;
    new.fulfilled_at := null;
    return new;
  end if;

  -- UPDATE: only completing it
  if old.fulfilled_at is not null then
    raise exception 'This request has already been completed' using errcode = 'check_violation';
  end if;
  if new.fulfilled_submission_id is null then
    raise exception 'A completed document is required' using errcode = 'check_violation';
  end if;
  if not exists (
    select 1 from public.document_submissions s
    where s.id = new.fulfilled_submission_id
      and s.template_id = old.template_id
      and s.submitted_by = (select auth.uid())
  ) then
    raise exception 'Must be your own document of the requested type'
      using errcode = 'insufficient_privilege';
  end if;
  new.template_id := old.template_id;
  new.requested_user_id := old.requested_user_id;
  new.requested_by := old.requested_by;
  new.source_submission_id := old.source_submission_id;
  new.created_at := old.created_at;
  new.fulfilled_at := now();
  return new;
end;
$$;

drop trigger if exists document_requests_guard on public.document_requests;
create trigger document_requests_guard
  before insert or update on public.document_requests
  for each row execute function public.document_requests_guard();


-- 3. Security --------------------------------------------------------------------

alter table public.document_requests enable row level security;

drop policy if exists "Signed-in users read document requests" on public.document_requests;
create policy "Signed-in users read document requests"
  on public.document_requests for select to authenticated
  using (true);

drop policy if exists "Submitters make document requests" on public.document_requests;
create policy "Submitters make document requests"
  on public.document_requests for insert to authenticated
  with check (
    exists (
      select 1 from public.document_submissions s
      where s.id = source_submission_id
        and s.submitted_by = (select auth.uid())
    )
  );

drop policy if exists "People complete their own requests" on public.document_requests;
create policy "People complete their own requests"
  on public.document_requests for update to authenticated
  using ((select auth.uid()) = requested_user_id and fulfilled_at is null)
  with check ((select auth.uid()) = requested_user_id);

drop policy if exists "Requesters withdraw open requests" on public.document_requests;
create policy "Requesters withdraw open requests"
  on public.document_requests for delete to authenticated
  using (fulfilled_at is null and (select auth.uid()) = requested_by);

revoke all on table public.document_requests from anon, authenticated;
grant select, insert, delete on table public.document_requests to authenticated;
grant update (fulfilled_submission_id) on table public.document_requests to authenticated;


-- 4. submit_document: also saves requests, and completes the submitter's own ---
-- Replaces the 6-argument version (two versions would confuse the API).
-- p_requests: [{"template_id": "...", "user_id": "..."}, ...]

drop function if exists public.submit_document(uuid, uuid, int, text, jsonb, jsonb);

create or replace function public.submit_document(
  p_id uuid,
  p_template_id uuid,
  p_template_version int,
  p_job_number text,
  p_answers jsonb,
  p_signatures jsonb default '[]'::jsonb,
  p_requests jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if jsonb_typeof(coalesce(p_signatures, '[]'::jsonb)) <> 'array' then
    raise exception 'p_signatures must be a JSON array' using errcode = 'invalid_parameter_value';
  end if;
  if jsonb_typeof(coalesce(p_requests, '[]'::jsonb)) <> 'array' then
    raise exception 'p_requests must be a JSON array' using errcode = 'invalid_parameter_value';
  end if;

  insert into public.document_submissions (id, template_id, template_version, job_number, answers)
  values (p_id, p_template_id, p_template_version, p_job_number, p_answers);

  insert into public.document_signatures (submission_id, field_id, sort_order, user_id, signature_path)
  select
    p_id,
    s ->> 'field_id',
    coalesce((s ->> 'sort_order')::int, 0),
    (s ->> 'user_id')::uuid,
    nullif(s ->> 'signature_path', '')
  from jsonb_array_elements(coalesce(p_signatures, '[]'::jsonb)) s;

  -- Requests this document makes (one per person per type)
  insert into public.document_requests (template_id, requested_user_id, source_submission_id)
  select distinct (r ->> 'template_id')::uuid, (r ->> 'user_id')::uuid, p_id
  from jsonb_array_elements(coalesce(p_requests, '[]'::jsonb)) r
  on conflict (source_submission_id, template_id, requested_user_id) do nothing;

  -- This document completes the submitter's open requests for its type
  update public.document_requests
  set fulfilled_submission_id = p_id
  where requested_user_id = (select auth.uid())
    and template_id = p_template_id
    and fulfilled_at is null;

  return p_id;
end;
$$;

revoke execute on function public.submit_document(uuid, uuid, int, text, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.submit_document(uuid, uuid, int, text, jsonb, jsonb, jsonb) to authenticated;


-- 5. Live updates ----------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public'
         and tablename = 'document_requests'
     ) then
    alter publication supabase_realtime add table public.document_requests;
  end if;
end $$;


-- 6. PSA v2: the harness checkbox requests a Harness Inspection -------------------

insert into public.document_template_versions (template_id, version, fields, created_by)
values (
  '00000000-0000-0000-0000-00000000d0c3',
  2,
  '[
    {"id": "job",                   "type": "job",          "label": "Job",                           "required": true},
    {"id": "foreman",               "type": "completed_by", "label": "Foreman"},
    {"id": "task_location",         "type": "text",         "label": "Specific task location"},
    {"id": "division",              "type": "select",       "label": "Division",
     "options": ["Decker", "Structural erection", "Misc. metal", "Painter", "Other"]},
    {"id": "division_other",        "type": "text",         "label": "Specify other",                 "required": true,
     "showIf": {"field": "division", "equals": "Other"}},
    {"id": "muster_point",          "type": "text",         "label": "Muster point"},
    {"id": "documents_referenced",  "type": "text",         "label": "Documents referenced"},
    {"id": "fall_protection",       "type": "text",         "label": "Fall protection system used?"},
    {"id": "notify_harness",        "type": "checkbox",     "label": "Request harness inspection",
     "requestDocument": {"templateId": "00000000-0000-0000-0000-00000000d0c4"}},
    {"id": "hazards_and_ppe",       "type": "textarea",     "label": "Hazards and PPE"},
    {"id": "ppe_requirements",      "type": "textarea",     "label": "PPE requirements"},
    {"id": "task",                  "type": "textarea",     "label": "Task"},
    {"id": "hazards",               "type": "textarea",     "label": "Hazards"},
    {"id": "controls",              "type": "textarea",     "label": "Controls"},
    {"id": "signatures",            "type": "signatures",   "label": "Signatures",                    "required": true}
  ]'::jsonb,
  null
)
on conflict (template_id, version) do nothing;

update public.document_templates
set updated_at = now()
where id = '00000000-0000-0000-0000-00000000d0c3';

notify pgrst, 'reload schema';
