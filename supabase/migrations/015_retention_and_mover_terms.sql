-- 015: data retention (privacy policy of 12 Nov 2026) and recorded acceptance of the mover terms.
--
-- Retention, run daily by /api/cron/retention:
--   * client videos: deleted 6 months after the move date (or after the tender opened when there is no date)
--   * tenders (leads, their offers cascade): deleted 24 months after the tender opened
--   * orphan uploads (no matching lead): deleted after 7 days
-- Storage files can only be removed through the Storage API, so the database lists what is due and the
-- route deletes the files with the admin header, then calls mm_retention_finish to clear the lead rows.

create policy "mm admin delete videos" on storage.objects for delete to anon
  using (bucket_id = 'movematch-videos' and public.mm_is_admin_request());

alter table movematch.leads add column if not exists videos_purged_at timestamptz;

create or replace function public.mm_safe_date(t text) returns date
language sql immutable set search_path = '' as $$
  select case when t ~ '^\d{4}-\d{2}-\d{2}$' then t::date end;
$$;

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
         or (l.id is not null and coalesce(public.mm_safe_date(l.move_when->>'date'), l.created_at::date)
                                  < (now() - interval '6 months')::date)
         or (l.id is not null and l.created_at < now() - interval '24 months')
       )
     order by o.created_at
     limit 1000;
end $$;

create or replace function public.mm_retention_finish(p_secret text, p_lead_ids uuid[])
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_cleared int; v_deleted int;
begin
  perform public.mm_check_admin(p_secret);
  update movematch.leads set videos = '[]'::jsonb, videos_purged_at = now()
   where id = any(coalesce(p_lead_ids, '{}')) and coalesce(jsonb_array_length(videos), 0) > 0;
  get diagnostics v_cleared = row_count;
  -- Old tenders go only once their files are gone (a failed file delete is retried the next day).
  delete from movematch.leads l
   where l.created_at < now() - interval '24 months'
     and not exists (select 1 from storage.objects o
                      where o.bucket_id = 'movematch-videos' and split_part(o.name, '/', 1) = l.id::text);
  get diagnostics v_deleted = row_count;
  return jsonb_build_object('videos_cleared', v_cleared, 'tenders_deleted', v_deleted);
end $$;

revoke all on function public.mm_retention_due(text) from public;
revoke all on function public.mm_retention_finish(text, uuid[]) from public;
grant execute on function public.mm_retention_due(text) to anon, service_role;
grant execute on function public.mm_retention_finish(text, uuid[]) to anon, service_role;

-- Mover terms: when and which version of the terms (including the 10% commission) the mover accepted at sign-up.
alter table movematch.movers add column if not exists terms_accepted_at timestamptz;
alter table movematch.movers add column if not exists terms_version text;

create or replace function public.mm_mover_signup(p jsonb, p_logo text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare m movematch.movers; v_phone text := p->>'phone';
  v_gu text := nullif(left(p->>'google_url', 500), ''); v_mu text := nullif(left(p->>'midrag_url', 500), '');
begin
  if v_phone !~ '^0\d{8,9}$' then raise exception 'invalid phone'; end if;
  if coalesce(length(trim(p->>'company')), 0) < 2 then raise exception 'invalid company'; end if;
  if p_logo is not null and (p_logo !~ '^data:image/(png|jpeg|webp);base64,' or length(p_logo) > 600000) then raise exception 'invalid logo'; end if;
  if (v_gu is not null and v_gu !~ '^https://') or (v_mu is not null and v_mu !~ '^https://') then raise exception 'invalid url'; end if;
  if coalesce(p->>'terms_version', '') = '' then raise exception 'terms'; end if;
  if exists (select 1 from movematch.movers where phone = v_phone) then raise exception 'exists'; end if;
  if (select count(*) from movematch.movers where status = 'pending' and created_at > now() - interval '1 day') >= 50 then raise exception 'too many'; end if;
  insert into movematch.movers(name, company_name, phone, email, logo, google_url, midrag_url, signup_note, status, active, terms_accepted_at, terms_version)
  values (left(trim(coalesce(p->>'name','')),120), left(trim(p->>'company'),120), v_phone, nullif(left(trim(coalesce(p->>'email','')),200),''),
          p_logo, v_gu, v_mu, nullif(left(trim(coalesce(p->>'note','')),1000),''), 'pending', false, now(), left(p->>'terms_version', 40))
  returning * into m;
  return jsonb_build_object('id', m.id, 'company', m.company_name);
end $function$;

-- Daily at 03:17 Israel-ish time (UTC 01:17).
select cron.schedule('mm-retention', '17 1 * * *', $$
  select net.http_post(
    url := 'https://movematch.co.il/api/cron/retention',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-mm-cron', (select value from movematch.settings where key = 'admin_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
$$);
