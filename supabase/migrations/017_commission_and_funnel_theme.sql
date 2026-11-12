-- 017: commission tracking in the admin panel, and the landing design (photo / art) saved on each lead
-- so the admin "funnel performance" tab can compare all 8 variants.

alter table movematch.leads add column if not exists theme text check (theme in ('photo', 'art'));

create or replace function public.mm_create_lead(p jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare r movematch.leads;
begin
  if coalesce(length(p->>'name'),0) < 2 or (p->>'phone') !~ '^05\d{8}$' then
    raise exception 'invalid lead';
  end if;
  -- Serialise per phone so two parallel submits can't both slip through.
  perform pg_advisory_xact_lock(hashtext('mm_phone:' || (p->>'phone')));
  perform movematch.phone_cooldown_check(p->>'phone');
  insert into movematch.leads(variant,status,furthest_step,name,phone,city,move_from,move_to,video_skipped,utm_source,utm_medium,utm_campaign,user_agent,theme)
  values (p->>'variant', coalesce(p->>'status','partial'), coalesce((p->>'furthest_step')::int,1),
    left(p->>'name',120), p->>'phone', left(p->>'city',80), p->'move_from', p->'move_to',
    coalesce((p->>'video_skipped')::boolean,false),
    left(p->>'utm_source',200), left(p->>'utm_medium',200), left(p->>'utm_campaign',200), left(p->>'user_agent',400),
    case when p->>'theme' in ('photo','art') then p->>'theme' end)
  returning * into r;
  return jsonb_build_object('id', r.id, 'token', r.edit_token);
end $function$;

-- Commission: the operator marks which offer became a finished job and at what final price,
-- then records the mover's commission payment. Amounts are whole shekels.
alter table movematch.bids add column if not exists final_price int check (final_price >= 0);
alter table movematch.bids add column if not exists commission_paid_at timestamptz;
alter table movematch.bids add column if not exists commission_paid_amount int check (commission_paid_amount >= 0);
alter table movematch.bids add column if not exists commission_note text;

create or replace function public.mm_admin_set_job(p_secret text, p_bid uuid, p_done boolean, p_final_price int)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.mm_check_admin(p_secret);
  if p_done then
    update movematch.bids set booked_at = coalesce(booked_at, now()), job_done_at = coalesce(job_done_at, now()),
           final_price = coalesce(p_final_price, final_price, price), updated_at = now()
     where id = p_bid;
  else
    update movematch.bids set job_done_at = null, final_price = null, commission_paid_at = null, commission_paid_amount = null, updated_at = now()
     where id = p_bid;
  end if;
end $$;

create or replace function public.mm_admin_set_commission(p_secret text, p_bid uuid, p_paid boolean, p_amount int, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.mm_check_admin(p_secret);
  update movematch.bids set commission_paid_at = case when p_paid then now() end,
         commission_paid_amount = case when p_paid then p_amount end,
         commission_note = nullif(left(coalesce(p_note, ''), 300), ''), updated_at = now()
   where id = p_bid and job_done_at is not null;
end $$;

revoke all on function public.mm_admin_set_job(text, uuid, boolean, int) from public;
revoke all on function public.mm_admin_set_commission(text, uuid, boolean, int, text) from public;
grant execute on function public.mm_admin_set_job(text, uuid, boolean, int) to anon, service_role;
grant execute on function public.mm_admin_set_commission(text, uuid, boolean, int, text) to anon, service_role;
