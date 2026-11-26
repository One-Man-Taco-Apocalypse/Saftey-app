-- Field Deficiency Report v3:
--   * "Completed by" near the top: automatically the signed-in user
--   * the single signature is replaced by a signatures table: starts with the
--     current user; people can be added/removed, each signs on their own pad
--
-- New field types:
--   completed_by -> saved in answers as the user's uid
--   signatures   -> saved in answers as [{"user_id": "...", "signature": "<storage path>"}, ...]
--
-- Older versions stay as-is, so reports submitted on them still display correctly.

insert into public.document_template_versions (template_id, version, fields, created_by)
values (
  '00000000-0000-0000-0000-00000000d0c2',
  3,
  '[
    {"id": "job",              "type": "job",          "label": "Job",           "required": true},
    {"id": "completed_by",     "type": "completed_by", "label": "Completed by"},
    {"id": "issue_type",       "type": "select",       "label": "Type of issue", "required": true,
     "options": ["Fabrication", "Installation", "General Contractor", "Coordination", "Design Error", "Other"]},
    {"id": "issue_type_other", "type": "text",         "label": "Specify other", "required": true,
     "showIf": {"field": "issue_type", "equals": "Other"}},
    {"id": "title",            "type": "text",         "label": "Title",         "required": true},
    {"id": "description",      "type": "textarea",     "label": "Description"},
    {"id": "proposed_fix",     "type": "textarea",     "label": "Proposed fix"},
    {"id": "comments",         "type": "textarea",     "label": "Comments"},
    {"id": "photos",           "type": "photos",       "label": "Photos"},
    {"id": "signatures",       "type": "signatures",   "label": "Signatures",    "required": true}
  ]'::jsonb,
  null
)
on conflict (template_id, version) do nothing;

update public.document_templates
set updated_at = now()
where id = '00000000-0000-0000-0000-00000000d0c2';
