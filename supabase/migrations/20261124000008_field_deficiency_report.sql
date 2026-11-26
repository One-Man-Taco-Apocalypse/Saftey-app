-- Field Deficiency Report template + storage for document photos.

-- 1. The template -------------------------------------------------------------
-- Field types used here:
--   job     -> project picker; saved to document_submissions.job_number
--   photos  -> photo upload; saved in answers as a list of storage paths
--   showIf  -> only show (and require) the field when another field has a value

insert into public.document_templates (id, name, description, created_by)
values (
  '00000000-0000-0000-0000-00000000d0c2',
  'Field Deficiency Report',
  'Report a problem found in the field',
  null
)
on conflict (id) do nothing;

insert into public.document_template_versions (template_id, version, fields, created_by)
values (
  '00000000-0000-0000-0000-00000000d0c2',
  1,
  '[
    {"id": "job",              "type": "job",      "label": "Job",           "required": true},
    {"id": "issue_type",       "type": "select",   "label": "Type of issue", "required": true,
     "options": ["Fabrication", "Installation", "General Contractor", "Coordination", "Design Error", "Other"]},
    {"id": "issue_type_other", "type": "text",     "label": "Specify other", "required": true,
     "showIf": {"field": "issue_type", "equals": "Other"}},
    {"id": "title",            "type": "text",     "label": "Title",         "required": true},
    {"id": "description",      "type": "textarea", "label": "Description"},
    {"id": "proposed_fix",     "type": "textarea", "label": "Proposed fix"},
    {"id": "comments",         "type": "textarea", "label": "Comments"},
    {"id": "photos",           "type": "photos",   "label": "Photos"}
  ]'::jsonb,
  null
)
on conflict (template_id, version) do nothing;


-- 2. Photo storage -------------------------------------------------------------
-- Private bucket (only signed-in users can see photos). Images only, max 10 MB each.
-- Files are saved as  <uploader's uid>/<submission id>/<file name>

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('document-photos', 'document-photos', false, 10485760, array['image/*'])
on conflict (id) do nothing;

drop policy if exists "Signed-in users view document photos" on storage.objects;
create policy "Signed-in users view document photos"
  on storage.objects for select to authenticated
  using (bucket_id = 'document-photos');

drop policy if exists "Users upload document photos to own folder" on storage.objects;
create policy "Users upload document photos to own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'document-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users delete own document photos" on storage.objects;
create policy "Users delete own document photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'document-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

notify pgrst, 'reload schema';
