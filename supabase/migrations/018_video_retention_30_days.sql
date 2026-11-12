-- 018: client videos are kept 30 days after the move date (owner decision, 12 Nov 2026), instead of 6 months.
-- With no fixed move date: 90 days after the tender opened, so a video is not deleted before a flexible move happens.
-- Replaces mm_retention_due from migration 015; applied to the live database on 12 Nov 2026.

create or replace function public.mm_retention_due(p_secret text)
returns table(name text, lead_id uuid)
language plpgsql security definer set search_path = '' as $$
begin
  perform public.mm_check_admin(p_secret);
  return query
    select o.name::text, l.id
      from storage.objects o
      left join movematch.leads l on l.id::text = split_part(o.name, '/', 1)
     where o.bucket_id = 'movematch-videos'
       and (
         (l.id is null and o.created_at < now() - interval '7 days')
         or (l.id is not null and public.mm_safe_date(l.move_when->>'date') is not null
             and public.mm_safe_date(l.move_when->>'date') < (now() - interval '30 days')::date)
         or (l.id is not null and public.mm_safe_date(l.move_when->>'date') is null
             and l.created_at < now() - interval '90 days')
         or (l.id is not null and l.created_at < now() - interval '24 months')
       )
     order by o.created_at
     limit 1000;
end $$;
