-- Toolbox talks: a library of talks (title, category, PDF) and a "Toolbox Talk"
-- form that records which talk was given, by whom, and who attended (signatures).
--
--   public.toolbox_talks    the library (Admin > Toolbox talks adds to it)
--   storage "toolbox-talks" the talks' PDF files (private; viewed with
--                           temporary links)
--   Toolbox Talk template   picks a talk (field type "toolbox_talk") and
--                           collects attendee signatures like other documents
--
-- Talks are never deleted, only archived, so signed records always point at
-- the talk they covered.
--
-- Who can add/edit talks: ANY signed-in user, for now (the app has no admin
-- role yet; tighten the "add"/"edit" policies when it does).
--
-- Only add PDFs you have the right to use (your own, or with the owner's
-- permission). Safe to re-run.

-- 1. The library -------------------------------------------------------------------

create table if not exists public.toolbox_talks (
  id uuid primary key default gen_random_uuid(),
  title text not null
    constraint toolbox_talks_title_length check (char_length(btrim(title)) between 1 and 150),
  category text not null
    constraint toolbox_talks_category_length check (char_length(btrim(category)) between 1 and 60),
  code text
    constraint toolbox_talks_code_length check (code is null or char_length(code) <= 20),
  summary text
    constraint toolbox_talks_summary_length check (summary is null or char_length(summary) <= 500),
  pdf_path text, -- path in the "toolbox-talks" bucket; null = no PDF yet
  archived boolean not null default false,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists toolbox_talks_category_idx
  on public.toolbox_talks (category, title) where not archived;
create index if not exists toolbox_talks_created_by_idx
  on public.toolbox_talks (created_by);

alter table public.toolbox_talks enable row level security;

drop policy if exists "Signed-in users read toolbox talks" on public.toolbox_talks;
create policy "Signed-in users read toolbox talks"
  on public.toolbox_talks for select to authenticated
  using (true);

drop policy if exists "Signed-in users add toolbox talks" on public.toolbox_talks;
create policy "Signed-in users add toolbox talks"
  on public.toolbox_talks for insert to authenticated
  with check (created_by = (select auth.uid()));

drop policy if exists "Signed-in users edit toolbox talks" on public.toolbox_talks;
create policy "Signed-in users edit toolbox talks"
  on public.toolbox_talks for update to authenticated
  using (true)
  with check (true);

-- No delete: archive instead
revoke all on table public.toolbox_talks from anon, authenticated;
grant select, insert on table public.toolbox_talks to authenticated;
grant update (title, category, code, summary, pdf_path, archived) on table public.toolbox_talks to authenticated;


-- 2. PDF storage -------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('toolbox-talks', 'toolbox-talks', false, 26214400, array['application/pdf']) -- 25 MB
on conflict (id) do nothing;

drop policy if exists "Signed-in users view toolbox talk PDFs" on storage.objects;
create policy "Signed-in users view toolbox talk PDFs"
  on storage.objects for select to authenticated
  using (bucket_id = 'toolbox-talks');

drop policy if exists "Signed-in users upload toolbox talk PDFs" on storage.objects;
create policy "Signed-in users upload toolbox talk PDFs"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'toolbox-talks');

-- Only files no talk uses can be removed (e.g. cleaning up a failed upload)
drop policy if exists "Users remove unused toolbox talk PDFs" on storage.objects;
create policy "Users remove unused toolbox talk PDFs"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'toolbox-talks'
    and owner = (select auth.uid())
    and not exists (select 1 from public.toolbox_talks t where t.pdf_path = name)
  );


-- 3. The Toolbox Talk form -----------------------------------------------------------

insert into public.document_templates (id, name, description, created_by)
values (
  '00000000-0000-0000-0000-00000000d0c5',
  'Toolbox Talk',
  'Record a toolbox talk and who attended',
  null
)
on conflict (id) do nothing;

insert into public.document_template_versions (template_id, version, fields, created_by)
values (
  '00000000-0000-0000-0000-00000000d0c5',
  1,
  '[
    {"id": "talk",        "type": "toolbox_talk", "label": "Toolbox talk",        "required": true},
    {"id": "job",         "type": "job",          "label": "Project",             "required": true},
    {"id": "presenter",   "type": "completed_by", "label": "Presented by"},
    {"id": "given_at",    "type": "datetime",     "label": "Date / time",         "required": true},
    {"id": "notes",       "type": "textarea",     "label": "Discussion notes / questions raised"},
    {"id": "signatures",  "type": "signatures",   "label": "Attendees",           "required": true}
  ]'::jsonb,
  null
)
on conflict (template_id, version) do nothing;

notify pgrst, 'reload schema';
