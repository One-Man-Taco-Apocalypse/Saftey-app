-- Live updates for new documents: the dashboard's Crew card shows documents a
-- crew member submitted in the last 12 hours, including ones with no signatures
-- (which never touch document_signatures), so it also listens to new submissions.
-- Realtime still applies the table's security rules (signed-in users can read).
-- Safe to re-run.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'document_submissions'
     ) then
    alter publication supabase_realtime add table public.document_submissions;
  end if;
end $$;
