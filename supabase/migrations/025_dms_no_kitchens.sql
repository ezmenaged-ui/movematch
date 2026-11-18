-- 024 (18 Nov 2026): DMS do not dismantle kitchens. Replace the service line "פירוק והרכבה, כולל מטבחים".
update movematch.movers
set profile = jsonb_set(profile, '{services}', (
  select jsonb_agg(case when s = 'פירוק והרכבה, כולל מטבחים' then to_jsonb('פירוק והרכבה של רהיטים'::text) else to_jsonb(s) end)
  from jsonb_array_elements_text(profile->'services') s))
where slug = 'dms';
