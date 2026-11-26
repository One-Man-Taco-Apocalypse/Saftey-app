-- Field Deficiency Report v2: same fields as v1 plus a signature at the bottom.
-- (v1 stays as-is so reports already submitted on it keep their original form.)
--
-- New field type:
--   signature -> drawn signature; saved as a PNG in the document-photos bucket,
--                and its storage path is saved in answers

insert into public.document_template_versions (template_id, version, fields, created_by)
select
  template_id,
  2,
  fields || '[{"id": "signature", "type": "signature", "label": "Signature", "required": true}]'::jsonb,
  null
from public.document_template_versions
where template_id = '00000000-0000-0000-0000-00000000d0c2'
  and version = 1
on conflict (template_id, version) do nothing;

update public.document_templates
set updated_at = now()
where id = '00000000-0000-0000-0000-00000000d0c2';


