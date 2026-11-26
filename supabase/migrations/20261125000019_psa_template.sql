-- PSA (Pre-task Safety Analysis) template.
--
-- Uses the same systems as the other documents: it gets a document number and
-- submit time from the database, the Job picker defaults to the current project,
-- and the Signatures table (with "Quick add: My crew" and signing later) starts
-- with the Foreman.
--
-- Field notes:
--   foreman            -> "completed_by" type: defaults to the signed-in user,
--                         can be changed; is the first signer
--   division_other     -> only shown (and required) when Division is "Other"
--   notify_harness     -> checkbox; saved with the document, does nothing else yet
--
-- Safe to re-run.

insert into public.document_templates (id, name, description, created_by)
values (
  '00000000-0000-0000-0000-00000000d0c3',
  'PSA',
  'Pre-task safety analysis',
  null
)
on conflict (id) do nothing;

insert into public.document_template_versions (template_id, version, fields, created_by)
values (
  '00000000-0000-0000-0000-00000000d0c3',
  1,
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
    {"id": "notify_harness",        "type": "checkbox",     "label": "Notify crew to complete harness inspection"},
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
