-- Allow "Foreman" as a position.
-- To add more later, list them all again in the same way.

alter table public.profiles drop constraint if exists profiles_position_check;

alter table public.profiles
  add constraint profiles_position_check
  check (position in ('Apprentice', 'Journeyman', 'Foreman'));
