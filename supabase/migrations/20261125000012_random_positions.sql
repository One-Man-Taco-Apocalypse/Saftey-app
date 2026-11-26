-- Give everyone without a position a random one: Journeyman or Apprentice.
-- People who already have a position keep it.

update public.profiles
set position = case when random() < 0.5 then 'Journeyman' else 'Apprentice' end
where position is null;

-- Check the result
select position, count(*) from public.profiles group by position order by position;
