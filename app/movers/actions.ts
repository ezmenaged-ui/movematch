'use server';
import { createHash, randomBytes } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { db } from '@/lib/db';
import { moverDb } from '@/lib/mover';
import { sendEmailTo } from '@/lib/notify';
import { authToken, cookieOpts, MV_AT, MV_RT, RT_MAX_AGE } from '@/lib/moverSession';

const s = (f: FormData, k: string, max = 200) => String(f.get(k) ?? '').trim().slice(0, max);
const safeNext = (n: string) => (/^\/movers(\/[\w\-/?=&%.]*)?$/.test(n) ? n : '/movers');
const sha = (t: string) => createHash('sha256').update(t).digest('hex');

async function origin() {
  const h = await headers();
  return `https://${h.get('x-forwarded-host') || h.get('host')}`;
}

// ── Sign in / out / passwords ────────────────────────────────────────────────

export async function login(form: FormData) {
  const email = s(form, 'email').toLowerCase();
  const password = String(form.get('password') || '');
  const next = safeNext(s(form, 'next', 300));
  const t = email && password ? await authToken('password', { email, password }) : null;
  if (!t) {
    await new Promise((r) => setTimeout(r, 500));
    redirect(`/movers/login?error=1&email=${encodeURIComponent(email)}`);
  }
  // Signed in to Supabase, but is this a mover with panel access?
  const probe = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${t.access_token}` } },
  });
  const { data: me, error } = await probe.rpc('mm_mover_me');
  if (error || !me) redirect('/movers/login?error=access');
  const c = await cookies();
  c.set(MV_AT, t.access_token, cookieOpts(t.expires_in));
  c.set(MV_RT, t.refresh_token, cookieOpts(RT_MAX_AGE));
  redirect((me as { must_change_password: boolean }).must_change_password ? '/movers/password' : next);
}

export async function logout() {
  const c = await cookies();
  const at = c.get(MV_AT)?.value;
  if (at) {
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/logout?scope=local`, {
      method: 'POST', headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, Authorization: `Bearer ${at}` },
    }).catch(() => undefined);
  }
  c.delete(MV_AT); c.delete(MV_RT);
  redirect('/movers/login?out=1');
}

export async function changePassword(form: FormData) {
  const pw = String(form.get('password') || ''), pw2 = String(form.get('password2') || '');
  if (pw.length < 8) redirect('/movers/password?error=short');
  if (pw !== pw2) redirect('/movers/password?error=match');
  const at = (await cookies()).get(MV_AT)?.value;
  const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
    method: 'PUT', headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, Authorization: `Bearer ${at}`, 'content-type': 'application/json' },
    body: JSON.stringify({ password: pw }),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    redirect(`/movers/password?error=${j.error_code === 'same_password' ? 'same' : j.error_code === 'weak_password' ? 'weak' : 'fail'}`);
  }
  await (await moverDb()).rpc('mm_mover_password_changed');
  redirect('/movers?welcome=1');
}

/** Email a one-hour reset link. Same answer whether or not the email exists. */
export async function forgotPassword(form: FormData) {
  const email = s(form, 'email').toLowerCase();
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    const token = randomBytes(32).toString('hex');
    const { data } = await db().rpc('mm_mover_request_reset', { p_secret: process.env.MM_ADMIN_SECRET, p_email: email, p_token_hash: sha(token) });
    if (data) {
      const link = `${await origin()}/movers/reset?t=${token}`;
      const who = (data as { name?: string }).name?.split(' ')[0] || '';
      const text = `שלום${who ? ` ${who}` : ''},\n\nקיבלנו בקשה לאיפוס הסיסמה לסביבת המובילים של MoveMatch.\nלבחירת סיסמה חדשה (הקישור בתוקף לשעה):\n${link}\n\nאם לא ביקשתם, אפשר להתעלם מההודעה.\n\nMoveMatch`;
      const html = `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6">שלום${who ? ` ${who}` : ''},<br><br>קיבלנו בקשה לאיפוס הסיסמה לסביבת המובילים של MoveMatch.<br><br><a href="${link}" style="display:inline-block;background:#1f4d3a;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none;font-weight:bold">בחירת סיסמה חדשה</a><br><br><small>הקישור בתוקף לשעה. אם לא ביקשתם, אפשר להתעלם מההודעה.</small></div>`;
      try { await sendEmailTo(email, 'איפוס סיסמה · MoveMatch', text, html); } catch (e) { console.error('[mover reset email]', e); redirect('/movers/forgot?error=send'); }
    }
  }
  redirect('/movers/forgot?sent=1');
}

export async function resetPassword(form: FormData) {
  const t = s(form, 't', 100);
  const pw = String(form.get('password') || ''), pw2 = String(form.get('password2') || '');
  if (pw.length < 8) redirect(`/movers/reset?t=${t}&error=short`);
  if (pw !== pw2) redirect(`/movers/reset?t=${t}&error=match`);
  const { error } = await db().rpc('mm_mover_reset_password', { p_secret: process.env.MM_ADMIN_SECRET, p_token_hash: sha(t), p_password: pw });
  if (error) redirect(`/movers/reset?t=${t}&error=${error.message.includes('invalid token') ? 'token' : 'fail'}`);
  redirect('/movers/login?reset=1');
}

// ── Jobs ─────────────────────────────────────────────────────────────────────

const T5 = /^\d{2}:\d{2}$/;
export async function bookJob(form: FormData) {
  const bid = s(form, 'bid', 40), lead = s(form, 'lead', 40);
  const date = s(form, 'date', 10), start = s(form, 'time', 5), end = s(form, 'end', 5);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) redirect(`/movers/leads/${lead}?error=date#booking`);
  if (T5.test(start) && T5.test(end) && end <= start) redirect(`/movers/leads/${lead}?error=hours#booking`);
  const crew = form.getAll('crew').map(String).filter((x) => /^[0-9a-f-]{36}$/.test(x));
  const { error } = await (await moverDb()).rpc('mm_mover_book_job', { p_bid: bid, p_date: date, p_start: T5.test(start) ? start : null, p_end: T5.test(end) ? end : null, p_crew: crew });
  if (error) redirect(`/movers/leads/${lead}?error=book#booking`);
  revalidatePath('/movers', 'layout');
  redirect(`/movers/leads/${lead}?ok=booked#booking`);
}

// ── Crew & hand-added jobs ───────────────────────────────────────────────────

export async function saveCrew(form: FormData) {
  const p = { id: s(form, 'id', 40), full_name: s(form, 'full_name', 120), email: s(form, 'email', 120), phone: s(form, 'phone', 20), lang: s(form, 'lang', 2) };
  if (!p.full_name) redirect('/movers/crew?error=name');
  const digits = p.phone.replace(/\D/g, '').replace(/^972/, '0');
  if (!/^0\d{8,9}$/.test(digits)) redirect('/movers/crew?error=phone');
  const { error } = await (await moverDb()).rpc('mm_mover_save_crew', { p: { ...p, phone: digits } });
  if (error) { console.error('[crew]', error); redirect('/movers/crew?error=db'); }
  revalidatePath('/movers', 'layout');
  redirect('/movers/crew?ok=1');
}

export async function deleteCrew(id: string) {
  await (await moverDb()).rpc('mm_mover_delete_crew', { p_id: id });
  revalidatePath('/movers', 'layout');
  redirect('/movers/crew?ok=del');
}

export async function saveJob(form: FormData) {
  const id = s(form, 'id', 40);
  const back = `/movers/calendar/job/${id || 'new'}`;
  const date = s(form, 'date', 10), start = s(form, 'start_time', 5), end = s(form, 'end_time', 5);
  const title = s(form, 'title', 120);
  if (!title) redirect(`${back}?error=title`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) redirect(`${back}?error=date`);
  if (T5.test(start) && T5.test(end) && end <= start) redirect(`${back}?error=hours`);
  const p = { id, title, date, start_time: T5.test(start) ? start : '', end_time: T5.test(end) ? end : '',
    from_text: s(form, 'from_text', 300), to_text: s(form, 'to_text', 300), items_text: s(form, 'items_text', 3000), notes: s(form, 'notes', 1000),
    crew_ids: form.getAll('crew').map(String).filter((x) => /^[0-9a-f-]{36}$/.test(x)) };
  const { error } = await (await moverDb()).rpc('mm_mover_save_job', { p });
  if (error) { console.error('[job]', error); redirect(`${back}?error=db`); }
  revalidatePath('/movers', 'layout');
  redirect(`/movers/calendar?w=${date}&ok=job`);
}

export async function deleteJob(id: string, week: string) {
  await (await moverDb()).rpc('mm_mover_delete_job', { p_id: id });
  revalidatePath('/movers', 'layout');
  redirect(`/movers/calendar?w=${week}`);
}

export async function unbookJob(bid: string, lead: string) {
  await (await moverDb()).rpc('mm_mover_book', { p_bid: bid, p_date: null, p_time: null });
  revalidatePath('/movers', 'layout');
  redirect(`/movers/leads/${lead}`);
}

export async function setJobDone(bid: string, lead: string, done: boolean) {
  await (await moverDb()).rpc('mm_mover_job_done', { p_bid: bid, p_done: done });
  revalidatePath('/movers', 'layout');
  redirect(`/movers/leads/${lead}${done ? '?ok=done' : ''}`);
}

// ── Profile ──────────────────────────────────────────────────────────────────

const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export async function saveProfile(form: FormData) {
  const company = s(form, 'company', 120);
  if (!company) redirect('/movers/profile?error=company');
  let logo: string | null = null;
  const f = form.get('logo');
  if (f && typeof f === 'object' && 'size' in f && f.size > 0) {
    if (!LOGO_TYPES.includes(f.type)) redirect('/movers/profile?error=logotype');
    if (f.size > 400 * 1024) redirect('/movers/profile?error=logosize');
    logo = `data:${f.type};base64,${Buffer.from(await f.arrayBuffer()).toString('base64')}`;
  }
  const business = (await (await moverDb()).rpc('mm_mover_me')).data?.business || {};
  const { error } = await (await moverDb()).rpc('mm_mover_save_profile', {
    p: { name: s(form, 'name', 120), company, business }, p_logo: logo, p_clear_logo: form.get('remove_logo') === 'on',
  });
  if (error) { console.error('[mover profile]', error); redirect('/movers/profile?error=db'); }
  revalidatePath('/movers', 'layout');
  redirect('/movers/profile?ok=1');
}

// ── Calendar ─────────────────────────────────────────────────────────────────

export type IcsEvent = { uid: string; date: string; time: string; title: string };
export async function importEvents(events: IcsEvent[]): Promise<{ ok: boolean; n?: number }> {
  const clean = events.slice(0, 2000).filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.date) && (!e.time || /^\d{2}:\d{2}$/.test(e.time)))
    .map((e) => ({ uid: String(e.uid).slice(0, 300), date: e.date, time: e.time || '', title: String(e.title || '').slice(0, 200) }));
  if (!clean.length) return { ok: false };
  const { data, error } = await (await moverDb()).rpc('mm_mover_import_events', { p: clean });
  if (error) { console.error('[ics import]', error); return { ok: false }; }
  revalidatePath('/movers/calendar');
  return { ok: true, n: data as number };
}

export async function deleteEvent(id: string, week: string) {
  await (await moverDb()).rpc('mm_mover_delete_event', { p_id: id });
  revalidatePath('/movers/calendar');
  redirect(`/movers/calendar?w=${week}`);
}
