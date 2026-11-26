-- Follow-up to 20261125000015_document_signatures.sql (run that one first).
--
-- 1. Signature images can't be deleted (or swapped) once a signature uses them.
--    Before: the owner could delete the PNG through the storage API and upload a
--    different one under the same name, changing a "signed" signature.
-- 2. Old documents: signatures are moved fully out of `answers` into
--    document_signatures (including people whose accounts were since deleted),
--    so `answers` is no longer a source of signatures that could be edited.
-- 3. document_signature_progress: signed / total per document, counted in the
--    database (the app used to download every row, which silently stops at 1000).
--    Requests for deleted accounts that were never signed don't count.
--
-- Safe to re-run.

-- 1. Lock signature images -------------------------------------------------------

create index if not exists document_signatures_signature_path_idx
  on public.document_signatures (signature_path)
  where signature_path is not null;

drop policy if exists "Users delete own document photos" on storage.objects;
create policy "Users delete own document photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'document-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    -- never a file that's someone's signature
    and not exists (
      select 1 from public.document_signatures d
      where d.signature_path = storage.objects.name
    )
  );
-- (There's no UPDATE policy on document photos, so files can't be overwritten
--  either; with delete blocked, a signature image can't be changed at all.)


-- 2. Finish moving old signatures out of answers ---------------------------------
-- 20261125000015 copied entries for people who still have an account. Copy the
-- rest as "removed user" rows, keeping the signature only if it was uploaded by
-- the document's submitter (old documents always uploaded to their folder).

insert into public.document_signatures
  (submission_id, field_id, sort_order, user_id, requested_by, signature_path, signed_at, created_at)
select
  s.id,
  f.key,
  (e.ord - 1)::int,
  null,
  s.submitted_by,
  sig.path,
  case when sig.path is not null then s.submitted_at end,
  s.submitted_at
from public.document_submissions s
cross join lateral jsonb_each(s.answers) f
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(f.value) = 'array' then f.value else '[]'::jsonb end
) with ordinality e(val, ord)
cross join lateral (
  select case
    when nullif(e.val ->> 'signature', '') is not null
     and split_part(e.val ->> 'signature', '/', 1) = s.submitted_by::text
    then e.val ->> 'signature'
  end as path
) sig
where jsonb_typeof(e.val) = 'object'
  and e.val ? 'user_id'
  -- (the CASE makes sure text that isn't a uuid is never cast, which would error)
  and not exists (
    select 1 from auth.users u
    where u.id = case
      when (e.val ->> 'user_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then (e.val ->> 'user_id')::uuid
    end
  )
  and not exists (
    select 1 from public.document_signatures d
    where d.submission_id = s.id and d.field_id = f.key and d.sort_order = (e.ord - 1)::int
  );

-- Now clear the old lists from answers (set to null, like new documents), without
-- touching updated_at. Only lists of {"user_id": ...} objects are cleared.
alter table public.document_submissions disable trigger document_submissions_updated_at;

-- Which answers are old signature lists. (Array functions only ever see arrays:
-- Postgres doesn't promise to check `jsonb_typeof` first in a plain AND.)
with old_lists as (
  select s.id, jsonb_object_agg(f.key, 'null'::jsonb) as cleared
  from public.document_submissions s
  cross join lateral jsonb_each(s.answers) f
  where case
    when jsonb_typeof(f.value) <> 'array' then false
    when jsonb_array_length(f.value) = 0 then false
    else not exists (
      select 1 from jsonb_array_elements(f.value) e
      where case when jsonb_typeof(e) = 'object' then not (e ? 'user_id') else true end
    )
  end
  group by s.id
)
update public.document_submissions s
set answers = s.answers || o.cleared
from old_lists o
where o.id = s.id;

alter table public.document_submissions enable trigger document_submissions_updated_at;


-- 3. Progress per document -------------------------------------------------------
-- security_invoker: runs with the viewer's permissions, so table rules still apply.

create or replace view public.document_signature_progress
with (security_invoker = true) as
select
  submission_id,
  count(*) filter (where signed_at is not null or user_id is not null)::int as total,
  count(*) filter (where signed_at is not null)::int as signed
from public.document_signatures
group by submission_id;

revoke all on public.document_signature_progress from anon, authenticated;
grant select on public.document_signature_progress to authenticated;

notify pgrst, 'reload schema';
