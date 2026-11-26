-- TEMPORARY: wipe every filled-in document (for testing). Remove before real use.
--
-- dev_clear_all_documents('DELETE ALL DOCUMENTS') deletes, for EVERYONE:
--   document_requests, document_signatures, document_submissions
-- Forms (templates and their versions) are kept. Document numbers start again
-- at #0 (the next number is the highest used + 1).
-- Uploaded files are NOT deleted here (Supabase only allows that through the
-- Storage API); the app removes the clicking user's own files afterwards.
--
-- SECURITY DEFINER because nobody is allowed to delete documents normally. Any
-- signed-in user can call it, which is why it must be removed later:
--
--   drop function if exists public.dev_clear_all_documents(text);
--
-- Safe to re-run.

create or replace function public.dev_clear_all_documents(p_confirm text)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted int;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in first' using errcode = 'insufficient_privilege';
  end if;
  if p_confirm is distinct from 'DELETE ALL DOCUMENTS' then
    raise exception 'Confirmation text did not match' using errcode = 'invalid_parameter_value';
  end if;

  select count(*) into deleted from public.document_submissions;

  -- (`where true`: Supabase refuses DELETE without a WHERE clause from the API)
  delete from public.document_requests where true;
  delete from public.document_signatures where true;
  delete from public.document_submissions where true;

  return deleted;
end;
$$;

revoke execute on function public.dev_clear_all_documents(text) from public, anon;
grant execute on function public.dev_clear_all_documents(text) to authenticated;

notify pgrst, 'reload schema';
