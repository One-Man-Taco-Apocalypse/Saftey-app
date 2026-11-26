-- Each user's current project and favorite projects, stored on their
-- user_settings row.

alter table public.user_settings
  -- The job number of the user's current project (empty if none).
  -- If that project is deleted, this is cleared.
  add column if not exists current_project text
    references public.projects(job_number) on delete set null on update cascade,
  -- List of the user's favorite job numbers, e.g. {SFJ6901B01,SFJ6901B02}
  add column if not exists favorite_projects text[] not null default '{}';

-- Remove the separate favorites table from the earlier version, if it was created.
drop table if exists public.favorite_projects;

-- Make sure the API notices the new columns straight away.
notify pgrst, 'reload schema';
