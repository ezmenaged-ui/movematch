'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { cleanUrl } from '@/lib/validate';

export async function setHandled(id: string, handled: boolean) {
  await db().rpc('mm_admin_set_handled', { p_secret: process.env.MM_ADMIN_SECRET, p_id: id, p_handled: handled });
  revalidatePath('/admin');
}

export async function setBidHidden(id: string, hidden: boolean) {
  await db().rpc('mm_admin_set_bid_hidden', { p_secret: process.env.MM_ADMIN_SECRET, p_id: id, p_hidden: hidden });
  revalidatePath('/admin');
}

const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const LOGO_MAX = 400 * 1024;

/** Add a mover, or edit one (form field "id"). Logo is optional; an empty file keeps the current logo. */
export async function saveMover(form: FormData) {
  const id = String(form.get('id') || '') || null;
  const name = String(form.get('name') || '').trim();
  const company = String(form.get('company') || '').trim();
  const phone = String(form.get('phone') || '').replace(/\D/g, '').replace(/^972/, '0');
  if (!/^0\d{8,9}$/.test(phone)) redirect('/admin/movers?err=phone');
  if (!company) redirect('/admin/movers?err=company');
  let logo: string | null = null;
  const f = form.get('logo');
  if (f && typeof f === 'object' && 'size' in f && f.size > 0) {
    if (!LOGO_TYPES.includes(f.type)) redirect('/admin/movers?err=logotype');
    if (f.size > LOGO_MAX) redirect('/admin/movers?err=logosize');
    logo = `data:${f.type};base64,${Buffer.from(await f.arrayBuffer()).toString('base64')}`;
  }
  const num = (k: string, max: number) => {
    const v = String(form.get(k) || '').replace(',', '.').trim();
    const n = Number(v);
    return v && Number.isFinite(n) && n >= 0 && n <= max ? String(Math.round(n * 10) / 10) : '';
  };
  const int = (k: string) => { const v = String(form.get(k) || '').replace(/[^\d]/g, ''); return v ? String(Math.min(1000000, Number(v))) : ''; };
  const url = (k: string) => cleanUrl(String(form.get(k) || '')) || '';
  for (const k of ['google_url', 'midrag_url', 'facebook_url']) if (cleanUrl(String(form.get(k) || '')) === null) redirect('/admin/movers?err=url');
  const p = {
    name, company, phone,
    google_url: url('google_url'), google_rating: num('google_rating', 5), google_reviews: int('google_reviews'),
    midrag_url: url('midrag_url'), midrag_rating: num('midrag_rating', 10), midrag_reviews: int('midrag_reviews'),
    facebook_url: url('facebook_url'), facebook_recommend: (() => { const v = num('facebook_recommend', 100); return v && String(Math.round(Number(v))); })(), facebook_reviews: int('facebook_reviews'),
  };
  const { error } = await db().rpc('mm_admin_save_mover', { p_secret: process.env.MM_ADMIN_SECRET, p_id: id, p, p_logo: logo });
  if (error) { console.error('[saveMover]', error); redirect('/admin/movers?err=db'); }
  revalidatePath('/admin/movers');
  revalidatePath('/our-movers', 'layout');
  redirect('/admin/movers?ok=1');
}

export async function clearMoverLogo(id: string) {
  await db().rpc('mm_admin_clear_mover_logo', { p_secret: process.env.MM_ADMIN_SECRET, p_id: id });
  revalidatePath('/admin/movers');
  revalidatePath('/our-movers', 'layout');
}

export async function setMoverActive(id: string, active: boolean) {
  await db().rpc('mm_admin_set_mover_active', { p_secret: process.env.MM_ADMIN_SECRET, p_id: id, p_active: active });
  revalidatePath('/admin/movers');
  revalidatePath('/our-movers', 'layout');
}

export async function deleteMover(id: string) {
  await db().rpc('mm_admin_delete_mover', { p_secret: process.env.MM_ADMIN_SECRET, p_id: id });
  revalidatePath('/admin/movers');
  revalidatePath('/our-movers', 'layout');
}

/** Send a test WhatsApp (mover template, with sample values) to one number. */
export async function testMover(phone: string) {
  const { sendWhatsApp } = await import('@/lib/whatsapp');
  const T = (await import('@/lib/wa-templates.json')).default;
  try { await sendWhatsApp(phone, 'mover_new_lead', T.mover_new_lead.sample); }
  catch (e) { console.error('[test mover]', e); redirect('/admin/movers?err=send'); }
  redirect('/admin/movers?ok=test');
}

export async function approveMover(id: string) {
  await db().rpc('mm_admin_approve_mover', { p_secret: process.env.MM_ADMIN_SECRET, p_id: id });
  revalidatePath('/admin/movers');
  revalidatePath('/our-movers', 'layout');
}

/** Give a mover panel access (email + first password), or reset their password. They must change it on first login. */
export async function setMoverLogin(form: FormData) {
  const id = String(form.get('id') || '');
  const email = String(form.get('email') || '').trim().toLowerCase();
  const password = String(form.get('password') || '');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) redirect('/admin/movers?err=email');
  if (password.length < 8) redirect('/admin/movers?err=pw');
  const { error } = await db().rpc('mm_admin_set_mover_login', { p_secret: process.env.MM_ADMIN_SECRET, p_mover: id, p_email: email, p_password: password });
  if (error) { console.error('[setMoverLogin]', error); redirect(`/admin/movers?err=${error.message.includes('email in use') ? 'emailused' : 'db'}`); }
  revalidatePath('/admin/movers');
  if (form.get('send') !== '1') redirect('/admin/movers?ok=login');
  const { siteUrl, sendEmailTo } = await import('@/lib/notify');
  const url = `${siteUrl() || ''}/movers/login`;
  const first = String(form.get('first') || '').trim();
  const hi = `שלום${first ? ` ${first}` : ''},`;
  const text = `${hi}\n\nפתחנו לך גישה לסביבת המובילים של MoveMatch: כל הפניות החדשות, ההצעות שלך, יומן ההובלות וטיוטות חשבונית במקום אחד.\n\nכניסה: ${url}\nמשתמש: ${email}\nסיסמה ראשונית: ${password}\n\nבכניסה הראשונה המערכת תבקש לבחור סיסמה אישית.\n\nMoveMatch`;
  const esc = (v: string) => v.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
  const html = `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#1c2a23;max-width:520px">
<p>${esc(hi)}</p><p>פתחנו לך גישה ל<b>סביבת המובילים של MoveMatch</b>: כל הפניות החדשות, ההצעות שלך, יומן ההובלות וטיוטות חשבונית במקום אחד.</p>
<table style="background:#eef5f0;border-radius:12px;padding:14px 18px;margin:14px 0;font-size:15px"><tr><td style="color:#607068;padding-left:14px">משתמש</td><td dir="ltr" style="text-align:right"><b>${esc(email)}</b></td></tr><tr><td style="color:#607068;padding-left:14px">סיסמה ראשונית</td><td dir="ltr" style="text-align:right"><b>${esc(password)}</b></td></tr></table>
<p><a href="${url}" style="display:inline-block;background:#1f4d3a;color:#fff;padding:11px 22px;border-radius:10px;text-decoration:none;font-weight:bold">כניסה לסביבת המובילים</a></p>
<p style="color:#607068;font-size:13px">בכניסה הראשונה המערכת תבקש לבחור סיסמה אישית.</p></div>`;
  try { await sendEmailTo(email, 'הגישה שלך לסביבת המובילים · MoveMatch', text, html); }
  catch (e) { console.error('[mover access email]', e); redirect('/admin/movers?err=mail'); }
  redirect(`/admin/movers?ok=sent&to=${encodeURIComponent(email)}`);
}

export async function revokeMoverLogin(id: string) {
  await db().rpc('mm_admin_revoke_mover_login', { p_secret: process.env.MM_ADMIN_SECRET, p_mover: id });
  revalidatePath('/admin/movers');
  redirect('/admin/movers?ok=1');
}

/** Money tab: mark an offer as the job that was done (with the final price), or undo it. */
export async function markJobDone(form: FormData) {
  const id = String(form.get('id') || '');
  const price = Math.round(Number(String(form.get('final_price') || '').replace(/[^\d.]/g, '')));
  await db().rpc('mm_admin_set_job', { p_secret: process.env.MM_ADMIN_SECRET, p_bid: id, p_done: true, p_final_price: Number.isFinite(price) && price > 0 ? price : null });
  revalidatePath('/admin/money');
}

export async function undoJobDone(id: string) {
  await db().rpc('mm_admin_set_job', { p_secret: process.env.MM_ADMIN_SECRET, p_bid: id, p_done: false, p_final_price: null });
  revalidatePath('/admin/money');
}

/** Money tab: record (or clear) the commission payment a mover made for one job. */
export async function setCommissionPaid(form: FormData) {
  const id = String(form.get('id') || '');
  const amount = Math.round(Number(String(form.get('amount') || '').replace(/[^\d.]/g, '')));
  await db().rpc('mm_admin_set_commission', { p_secret: process.env.MM_ADMIN_SECRET, p_bid: id, p_paid: true, p_amount: Number.isFinite(amount) ? amount : 0, p_note: String(form.get('note') || '') });
  revalidatePath('/admin/money');
}

export async function clearCommissionPaid(id: string) {
  await db().rpc('mm_admin_set_commission', { p_secret: process.env.MM_ADMIN_SECRET, p_bid: id, p_paid: false, p_amount: null, p_note: '' });
  revalidatePath('/admin/money');
}

/** Replace a mover's service areas (form: id + checkboxes "areas"). Leads are routed by these areas. */
export async function setMoverAreas(form: FormData) {
  const { cleanAreas } = await import('@/lib/areas');
  const id = String(form.get('id') || '');
  const areas = cleanAreas(form.getAll('areas').map(String));
  const { error } = await db().rpc('mm_admin_set_mover_areas', { p_secret: process.env.MM_ADMIN_SECRET, p_id: id, p_areas: areas });
  if (error) { console.error('[setMoverAreas]', error); redirect('/admin/movers?err=db'); }
  revalidatePath('/admin/movers');
  redirect('/admin/movers?ok=1');
}

/** Public profile of a mover (/our-movers/<slug>): slug, on/off switch and the content fields. */
export async function saveMoverProfile(form: FormData) {
  const { profileFromForm } = await import('@/lib/profileForm');
  const id = String(form.get('id') || '');
  const slug = String(form.get('slug') || '').trim().toLowerCase();
  if (slug && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) redirect('/admin/movers?err=slug');
  const { error } = await db().rpc('mm_admin_save_mover_profile', {
    p_secret: process.env.MM_ADMIN_SECRET, p_id: id, p_slug: slug, p_public: form.get('public') === 'on', p_profile: profileFromForm(form),
  });
  if (error) { console.error('[saveMoverProfile]', error); redirect(`/admin/movers?err=${/unique|duplicate/.test(error.message) ? 'slugused' : 'db'}`); }
  revalidatePath('/admin/movers');
  revalidatePath('/our-movers', 'layout');
  redirect('/admin/movers?ok=profile');
}

/** A company that has not joined yet: hidden profile, no leads. It takes over this row when it signs up with the same phone. */
export async function addProspect(form: FormData) {
  const company = String(form.get('company') || '').trim();
  const phone = String(form.get('phone') || '').replace(/\D/g, '').replace(/^972/, '0');
  if (!/^0\d{8,9}$/.test(phone)) redirect('/admin/movers?err=phone');
  if (company.length < 2) redirect('/admin/movers?err=company');
  const { error } = await db().rpc('mm_admin_add_prospect', { p_secret: process.env.MM_ADMIN_SECRET, p_company: company, p_phone: phone });
  if (error) { console.error('[addProspect]', error); redirect(`/admin/movers?err=${/unique|duplicate/.test(error.message) ? 'phoneused' : 'db'}`); }
  revalidatePath('/admin/movers');
  redirect('/admin/movers?ok=1#prospects');
}

/** /admin/inbox: reply to a WhatsApp conversation from the business number (lib/inbox.ts enforces the 24h window). */
export async function sendInboxReply(form: FormData) {
  const { sendReply } = await import('@/lib/inbox');
  const phone = String(form.get('phone') || '').replace(/\D/g, '');
  const body = String(form.get('body') || '').slice(0, 1500);
  if (!phone) redirect('/admin/inbox');
  const r = await sendReply(phone, body, { via: 'admin' });
  revalidatePath('/admin/inbox');
  redirect(`/admin/inbox?p=${phone}&${r.ok ? 'sent=1' : `err=${r.reason}`}#end`);
}
