import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db, LeadRow } from '@/lib/db';
import { sendEmail, siteUrl } from '@/lib/notify';
import { tenderRef } from '@/lib/publicLead';

/**
 * Called every 5 minutes by the database scheduler (pg_cron → pg_net, see migration 011).
 * Emails the operator once per lead that filled the first page but didn't finish within 15 minutes.
 */
const FUNNEL: Record<string, string> = { wizard: 'B', form: 'C', items: 'D', choice: 'E', chat: 'F (וואטסאפ)' };
const STEP: Record<string, string[]> = {
  wizard: ['', 'פרטים (עמוד ראשון)', 'מאיפה', 'לאן', 'מתי', 'פריטים'],
  choice: ['', 'פרטים (עמוד ראשון)', 'מאיפה', 'לאן', 'מתי', 'סרטון או פריטים'],
  items: ['', 'פרטים (עמוד ראשון)', 'מאיפה', 'לאן', 'מתי', 'פריטים', 'סרטונים'],
  form: ['', 'פרטים (עמוד ראשון)', 'טופס הפרטים'],
  chat: ['', 'מאיפה', 'לאן', 'מתי', 'סרטון', 'שם'],
};
const fmt = (d: string) => new Date(d).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', dateStyle: 'short', timeStyle: 'short' });

function authorized(req: NextRequest) {
  const key = process.env.MM_ADMIN_SECRET || '';
  const got = req.headers.get('x-mm-cron') || '';
  return !!key && got.length === key.length && timingSafeEqual(Buffer.from(got), Buffer.from(key));
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return new NextResponse('forbidden', { status: 403 });
  const { data, error } = await db().rpc('mm_admin_claim_abandoned', { p_secret: process.env.MM_ADMIN_SECRET });
  if (error) { console.error('[abandoned]', error); return NextResponse.json({ error: 'db' }, { status: 500 }); }
  const leads = (data || []) as (LeadRow & { client_code: string | null })[];
  const site = siteUrl();
  let sent = 0;
  for (const l of leads) {
    const steps = STEP[l.variant] || [];
    const reached = steps[Math.min(l.furthest_step, steps.length - 1)] || `שלב ${l.furthest_step}`;
    const text = [
      `⏳ לקוח מילא את העמוד הראשון ולא סיים את התהליך תוך 15 דקות.`,
      ``,
      `שם: ${l.name}`,
      `טלפון: ${l.phone}`,
      `וואטסאפ: https://wa.me/972${l.phone.slice(1)}`,
      l.city ? `עיר: ${l.city}` : '',
      `משפך: ${FUNNEL[l.variant] || l.variant} · מכרז ${tenderRef(l)}`,
      `עצר בשלב: ${reached} (שלב ${l.furthest_step})`,
      `נכנס: ${fmt(l.created_at)}`,
      l.utm_source ? `מקור: ${[l.utm_source, l.utm_medium, l.utm_campaign].filter(Boolean).join(' / ')}` : '',
      '',
      l.client_code ? `דף המכרז של הלקוח (עם כפתור להשלמת הפרטים): ${site}/t/${l.client_code}` : '',
      `כל הלידים: ${site}/admin`,
    ].filter((x) => x !== '').join('\n').replace('\n\nשם', '\n\nשם');
    try { await sendEmail(`⏳ לא סיים: ${l.name} · ${l.phone} · משפך ${FUNNEL[l.variant] || l.variant}`, text); sent++; }
    catch (e) { console.error('[abandoned] email', e); }
  }
  return NextResponse.json({ checked: leads.length, sent });
}
