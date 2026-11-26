-- Harness Inspection template.
--
-- Same systems as the other documents: document number + submit time from the
-- database, Job defaults to the current project, Signatures table (Quick add:
-- My crew, signing later) starts with the Foreman.
--
-- New field types used here (the app supports them from this change on):
--   person      -> pick anyone, starts empty; saved as their uid  ("Inspected by")
--   datetime    -> date + time, starts at "now"; saved as an ISO timestamp
--   section     -> a heading grouping the fields after it; saves nothing
--   yes_no_na   -> Yes / No / N/A buttons; saved as "yes" | "no" | "na"
--
-- Every checklist item must be answered (required).
-- Safe to re-run.

insert into public.document_templates (id, name, description, created_by)
values (
  '00000000-0000-0000-0000-00000000d0c4',
  'Harness Inspection',
  'Inspect a harness and lanyard before use',
  null
)
on conflict (id) do nothing;

insert into public.document_template_versions (template_id, version, fields, created_by)
values (
  '00000000-0000-0000-0000-00000000d0c4',
  1,
  '[
    {"id": "job",                   "type": "job",          "label": "Job",                          "required": true},
    {"id": "foreman",               "type": "completed_by", "label": "Foreman"},
    {"id": "inspected_by",          "type": "person",       "label": "Inspected by",                 "required": true},
    {"id": "inspected_at",          "type": "datetime",     "label": "Date / time",                  "required": true},
    {"id": "harness_type",          "type": "text",         "label": "Harness type / name"},
    {"id": "model_number",          "type": "text",         "label": "Model number"},

    {"id": "section_inspection",    "type": "section",      "label": "Inspection"},
    {"id": "harness_stitching",     "type": "yes_no_na",    "label": "Harness stitching",            "required": true},
    {"id": "harness_webbing",       "type": "yes_no_na",    "label": "Harness webbing",              "required": true},
    {"id": "harness_components",    "type": "yes_no_na",    "label": "Harness components",           "required": true},
    {"id": "harness_wear",          "type": "yes_no_na",    "label": "Harness wear and tear – none", "required": true},
    {"id": "lanyard_stitching",     "type": "yes_no_na",    "label": "Lanyard stitching",            "required": true},
    {"id": "lanyard_webbing",       "type": "yes_no_na",    "label": "Lanyard webbing",              "required": true},
    {"id": "lanyard_components",    "type": "yes_no_na",    "label": "Lanyard components",           "required": true},
    {"id": "lanyard_wear",          "type": "yes_no_na",    "label": "Lanyard wear and tear – none", "required": true},
    {"id": "signage_available",     "type": "yes_no_na",    "label": "Signage available",            "required": true},
    {"id": "buddy_system",          "type": "yes_no_na",    "label": "Buddy system",                 "required": true},
    {"id": "communication",         "type": "yes_no_na",    "label": "Communication available",      "required": true},
    {"id": "rescue_procedure",      "type": "yes_no_na",    "label": "Rescue procedure available",   "required": true},

    {"id": "section_comments",      "type": "section",      "label": "Comments and corrective action"},
    {"id": "comments",              "type": "textarea",     "label": "Comments"},
    {"id": "corrective_action",     "type": "textarea",     "label": "Corrective action"},

    {"id": "signatures",            "type": "signatures",   "label": "Signatures",                   "required": true}
  ]'::jsonb,
  null
)
on conflict (template_id, version) do nothing;

update public.document_templates
set updated_at = now()
where id = '00000000-0000-0000-0000-00000000d0c4';
