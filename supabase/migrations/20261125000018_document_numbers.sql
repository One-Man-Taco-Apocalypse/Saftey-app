-- Document numbers: every document gets an internal number, starting at 0.
-- A new document always gets the next number after the highest one used, with
-- no gaps (a failed save doesn't use up a number, because it rolls back).
-- Numbers are shared by all document types.
--
-- Also makes the submission time trustworthy: submitted_at is always the
-- server's clock at the moment of saving and can't be changed afterwards.
--
-- Existing documents are numbered in the order they were submitted.
-- Safe to re-run.

-- 1. The column + numbers for existing documents ----------------------------------

alter table public.document_submissions
  add column if not exists document_number int;

alter table public.document_submissions disable trigger document_submissions_updated_at;

with numbered as (
  select id,
         (select coalesce(max(document_number), -1) from public.document_submissions)
           + row_number() over (order by submitted_at, id) as n
  from public.document_submissions
  where document_number is null
)
update public.document_submissions s
set document_number = numbered.n
from numbered
where numbered.id = s.id;

alter table public.document_submissions enable trigger document_submissions_updated_at;

alter table public.document_submissions
  alter column document_number set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'document_submissions_document_number_key'
  ) then
    alter table public.document_submissions
      add constraint document_submissions_document_number_key unique (document_number);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'document_submissions_document_number_check'
  ) then
    alter table public.document_submissions
      add constraint document_submissions_document_number_check check (document_number >= 0);
  end if;
end $$;


-- 2. Number + time are always set by the database --------------------------------
-- SECURITY DEFINER so numbering always sees every document, even if who-can-read
-- rules are tightened later. It's a trigger function, so it can't be called from
-- the API, and it only ever touches the row being saved.

create or replace function public.document_submissions_number_and_time()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    -- One save at a time gets a number, so two can't get the same one
    perform pg_advisory_xact_lock(hashtext('public.document_submissions.document_number'));
    select coalesce(max(document_number), -1) + 1
      into new.document_number
      from public.document_submissions;
    new.submitted_at := now();
  else
    -- Never changes after saving
    new.document_number := old.document_number;
    new.submitted_at := old.submitted_at;
  end if;
  return new;
end;
$$;

revoke execute on function public.document_submissions_number_and_time() from public, anon, authenticated;

drop trigger if exists document_submissions_number_and_time on public.document_submissions;
create trigger document_submissions_number_and_time
  before insert or update on public.document_submissions
  for each row execute function public.document_submissions_number_and_time();

notify pgrst, 'reload schema';
