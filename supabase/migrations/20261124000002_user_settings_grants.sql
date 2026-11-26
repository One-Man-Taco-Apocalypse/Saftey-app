-- Let signed-in users reach the user_settings table at all.
-- (Row-level security policies still limit them to their own row.)
-- Newer Supabase projects don't grant this automatically on new tables.

grant select, update on table public.user_settings to authenticated;
