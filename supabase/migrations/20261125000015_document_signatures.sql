-- Signature requests: one row per person asked to sign a document.
--
--   document_signatures   who has to sign which document (and which signatures
--                         field on it), and their signature once they've signed
--
-- Why a separate table (instead of inside document_submissions.answers):
--   * a requested person can sign LATER, without being able to edit the rest of
--     the document (only the submitter can edit document_submissions)
--   * "what's waiting for my signature?" is one fast indexed lookup
--
-- Rules (enforced by the database, not just the app):
--   * only the person who submitted a document can add or remove requests on it
--   * a signer can only fill in THEIR OWN unsigned request, and only the
--     signature image (column-level grant); signed_at is stamped by the server
--   * once signed, a request can't be changed or removed
--   * the signature image must be the signer's own upload and must exist
--
-- New documents are saved with submit_document(), which saves the document and
-- its signature requests together (all or nothing).
-- Existing documents' signatures are copied in from answers. Safe to re-run.

-- 1. The table -------------------------------------------------------------------

create table if not exists public.document_signatures (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.document_submissions(id) on delete cascade,
  field_id text not null,                     -- which "signatures" field on the form
  sort_order int not null default 0,          -- row order in that field's table
  user_id uuid references auth.users(id) on delete set null, -- who has to sign
  requested_by uuid references auth.users(id) on delete set null,
  signature_path text,                        -- storage path of the PNG; null = not signed yet
  signed_at timestamptz,                      -- set by the server when they sign
  created_at timestamptz not null default now(),
  constraint document_signatures_signed_together
    check ((signature_path is null) = (signed_at is null)),
  constraint document_signatures_one_per_person
    unique (submission_id, field_id, user_id)
);

-- "What's waiting for me?" — only unsigned rows, so it stays small
create index if not exists document_signatures_outstanding_idx
  on public.document_signatures (user_id)
  where signed_at is null;


-- 2. Copy signatures from existing documents --------------------------------------
-- Old documents kept them in answers as [{"user_id": "...", "signature": "<path>"}].
-- Runs before the guard trigger exists; on a re-run the trigger lets admins through.

insert into public.document_signatures
  (submission_id, field_id, sort_order, user_id, requested_by, signature_path, signed_at, created_at)
select
  s.id,
  f.key,
  (e.ord - 1)::int,
  u.id,
  s.submitted_by,
  nullif(e.val ->> 'signature', ''),
  case when nullif(e.val ->> 'signature', '') is not null then s.submitted_at end,
  s.submitted_at
from public.document_submissions s
cross join lateral jsonb_each(s.answers) f
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(f.value) = 'array' then f.value else '[]'::jsonb end
) with ordinality e(val, ord)
-- Only people who still have an account. (The CASE makes sure text that isn't a
-- uuid is never cast, which would error.)
join auth.users u on u.id = case
  when jsonb_typeof(e.val) = 'object'
   and (e.val ->> 'user_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  then (e.val ->> 'user_id')::uuid
end
-- Never re-add requests on documents already moved over (e.g. ones since withdrawn)
where not exists (select 1 from public.document_signatures d where d.submission_id = s.id)
on conflict (submission_id, field_id, user_id) do nothing;


-- 3. Guard trigger ---------------------------------------------------------------
-- Stamps who/when on the server and blocks anything the rules don't allow.
-- Admin sessions (SQL editor, service role) are let through for maintenance.

create or replace function public.document_signatures_guard()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.requested_by := (select auth.uid());
    new.created_at := now();
    new.signed_at := case when new.signature_path is null then null else now() end;
  else
    if old.signed_at is not null then
      raise exception 'This signature has already been signed and can''t be changed'
        using errcode = 'check_violation';
    end if;
    if new.signature_path is null then
      raise exception 'A signature is required' using errcode = 'check_violation';
    end if;
    -- Nothing else about the request may change (column grants also stop this)
    new.submission_id := old.submission_id;
    new.field_id := old.field_id;
    new.sort_order := old.sort_order;
    new.user_id := old.user_id;
    new.requested_by := old.requested_by;
    new.created_at := old.created_at;
    new.signed_at := now();
  end if;

  -- The signature image must be the caller's own upload, and must really exist
  if new.signature_path is not null then
    if split_part(new.signature_path, '/', 1) <> (select auth.uid())::text then
      raise exception 'Signature image must be your own upload'
        using errcode = 'insufficient_privilege';
    end if;
    if not exists (
      select 1 from storage.objects o
      where o.bucket_id = 'document-photos' and o.name = new.signature_path
    ) then
      raise exception 'Signature image not found' using errcode = 'foreign_key_violation';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists document_signatures_guard on public.document_signatures;
create trigger document_signatures_guard
  before insert or update on public.document_signatures
  for each row execute function public.document_signatures_guard();


-- 4. Security --------------------------------------------------------------------

alter table public.document_signatures enable row level security;

-- Same visibility as documents: every signed-in user can read
drop policy if exists "Signed-in users read signatures" on public.document_signatures;
create policy "Signed-in users read signatures"
  on public.document_signatures for select to authenticated
  using (true);

-- Only the document's submitter adds requests
drop policy if exists "Submitters request signatures" on public.document_signatures;
create policy "Submitters request signatures"
  on public.document_signatures for insert to authenticated
  with check (
    exists (
      select 1 from public.document_submissions s
      where s.id = submission_id
        and s.submitted_by = (select auth.uid())
    )
  );

-- Signers fill in their own unsigned request
drop policy if exists "Signers sign their own requests" on public.document_signatures;
create policy "Signers sign their own requests"
  on public.document_signatures for update to authenticated
  using ((select auth.uid()) = user_id and signed_at is null)
  with check ((select auth.uid()) = user_id);

-- The submitter can withdraw a request nobody has signed yet
drop policy if exists "Submitters withdraw unsigned requests" on public.document_signatures;
create policy "Submitters withdraw unsigned requests"
  on public.document_signatures for delete to authenticated
  using (
    signed_at is null
    and exists (
      select 1 from public.document_submissions s
      where s.id = submission_id
        and s.submitted_by = (select auth.uid())
    )
  );

-- Explicit grants (new tables aren't exposed to the Data API automatically).
-- UPDATE is limited to the signature column.
revoke all on table public.document_signatures from anon, authenticated;
grant select, insert, delete on table public.document_signatures to authenticated;
grant update (signature_path) on table public.document_signatures to authenticated;


-- 5. Save a document and its signature requests together -------------------------
-- p_signatures: [{"field_id": "...", "sort_order": 0, "user_id": "...",
--                 "signature_path": "<path or null>"}, ...]
-- Runs as the caller, so all the rules above still apply.

create or replace function public.submit_document(
  p_id uuid,
  p_template_id uuid,
  p_template_version int,
  p_job_number text,
  p_answers jsonb,
  p_signatures jsonb default '[]'::jsonb
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

  return p_id;
end;
$$;

revoke execute on function public.submit_document(uuid, uuid, int, text, jsonb, jsonb) from public, anon;
grant execute on function public.submit_document(uuid, uuid, int, text, jsonb, jsonb) to authenticated;


-- 6. Live updates ----------------------------------------------------------------
-- Lets the dashboard update the moment someone asks you to sign.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'document_signatures'
     ) then
    alter publication supabase_realtime add table public.document_signatures;
  end if;
end $$;

notify pgrst, 'reload schema';
