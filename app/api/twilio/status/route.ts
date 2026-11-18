import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db, LeadRow } from '@/lib/db';
import { siteUrl } from '@/lib/notify';
import { sendWhatsAppText, trySendSms } from '@/lib/whatsapp';
import { displayPhone, inboxLink } from '@/lib/inbox';
import { moverAlertSms, operatorAlertSms } from '@/lib/alertSms';

/**
 * Twilio delivery-status callback. When a WhatsApp message can't be delivered (number not on WhatsApp,
 * sender blocked by Meta, etc.), send it by SMS instead: client "tender opened", mover new-lead alert, operator lead alert.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function validSignature(req: NextRequest, params: URLSearchParams) {
  const token = process.env.TWILIO_AUTH_TOKEN;
  const sig = req.headers.get('x-twilio-signature') || '';
  if (!token || !sig) return false;
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const url = `https://${host}${req.nextUrl.pathname}${req.nextUrl.search}`;
  const data = url + [...params.keys()].sort().map((k) => k + params.getAll(k).join('')).join('');
  const a = Buffer.from(createHmac('sha1', token).update(data, 'utf8').digest('base64')), b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const params = new URLSearchParams(await req.text());
  const key = process.env.TWILIO_WEBHOOK_KEY, k = req.nextUrl.searchParams.get('k') || '';
  const keyOk = !!key && k.length === key.length && timingSafeEqual(Buffer.from(k), Buffer.from(key));
  if (!keyOk && !validSignature(req, params)) {
    console.warn('[status] refused', JSON.stringify({ key: !!k, sig: !!req.headers.get('x-twilio-signature') }));
    return new NextResponse('forbidden', { status: 403 });
  }
  const status = params.get('MessageStatus') || '';
  const lead = req.nextUrl.searchParams.get('lead') || '';
  const kind = req.nextUrl.searchParams.get('kind') || '';
  if (kind === 'inbox_out' || kind === 'inbox_alert') return inboxStatus(kind, status, params, req.nextUrl.searchParams.get('p') || '');
  if (!['tender_open', 'mover_ping', 'op_lead'].includes(kind) || !UUID.test(lead) || !['failed', 'undelivered'].includes(status)) return new NextResponse(null, { status: 204 });
  console.warn(`[status] WhatsApp ${kind} not delivered`, status, params.get('ErrorCode'), '→ SMS');

  if (kind === 'mover_ping' || kind === 'op_lead') {
    const { data } = await db().rpc('mm_admin_lead', { p_secret: process.env.MM_ADMIN_SECRET, p_id: lead });
    const l = data as LeadRow | null;
    if (!l) return new NextResponse(null, { status: 204 });
    if (kind === 'op_lead') {
      await trySendSms('op-lead-fallback', process.env.OPERATOR_WHATSAPP || '', operatorAlertSms(l, siteUrl()));
    } else {
      const moverId = req.nextUrl.searchParams.get('mover') || '';
      const { data: ms } = await db().rpc('mm_admin_movers', { p_secret: process.env.MM_ADMIN_SECRET });
      const m = ((ms || []) as { id: string; phone: string; token: string; active: boolean }[]).find((x) => x.id === moverId);
      if (m?.active) await trySendSms('mover-fallback', m.phone, moverAlertSms(l, m, siteUrl()));
    }
    return new NextResponse(null, { status: 204 });
  }

  const { data } = await db().rpc('mm_admin_lead', { p_secret: process.env.MM_ADMIN_SECRET, p_id: lead });
  const l = data as LeadRow | null;
  if (l?.client_code) {
    const first = l.name.trim().split(/\s+/)[0];
    await trySendSms('tender-open-fallback', l.phone, [
      `היי ${first}, מכרז הובלה מס׳ ${l.tender_no} נפתח בהצלחה.`,
      'בדף המכרז שלך אפשר לראות את הצעות המחיר מהמובילים בזמן אמת ולבחור את המוביל שלך:',
      `${siteUrl()}/t/${l.client_code}`,
      'צוות MoveMatch',
    ].join('\n'));
  }
  return new NextResponse(null, { status: 204 });
}

/**
 * Inbox (lib/inbox.ts):
 *  inbox_out   — a reply to a customer: save its status (shown in /admin/inbox); if it failed, tell the operator.
 *  inbox_alert — an alert to the operator about a new message failed: SMS the operator instead.
 */
async function inboxStatus(kind: string, status: string, params: URLSearchParams, phone: string) {
  const failed = ['failed', 'undelivered'].includes(status);
  const op = process.env.OPERATOR_WHATSAPP || '';
  const code = params.get('ErrorCode') || '';
  if (kind === 'inbox_alert') {
    if (failed && /^\d{6,15}$/.test(phone)) {
      console.warn('[status] inbox alert not delivered', status, code, '→ SMS');
      await trySendSms('inbox-alert-fallback', op, `הודעת ווטסאפ חדשה מ-${displayPhone(phone)}.\nלקריאה ותשובה: ${inboxLink(phone)}`);
    }
    return new NextResponse(null, { status: 204 });
  }
  const sid = params.get('MessageSid') || '';
  const { data } = await db().rpc('mm_inbox_set_status', { p_secret: process.env.MM_ADMIN_SECRET, p_sid: sid, p_status: status, p_error: code });
  const m = data as { phone: string; name: string | null; body: string; via: string } | null;
  if (failed && m) {
    console.warn('[status] inbox reply not delivered', status, code);
    const why = code === '63016' ? 'עברו 24 שעות מההודעה האחרונה של הלקוח' : code === '63024' ? 'למספר אין ווטסאפ' : `קוד ${code || '?'}`;
    const text = `⚠️ התשובה ל-${m.name || displayPhone(m.phone)} לא נמסרה (${why}): "${m.body.slice(0, 60)}"\n${inboxLink(m.phone)}`;
    // The operator just wrote to us (their reply), so WhatsApp normally reaches them; SMS if not.
    try { if (m.via !== 'whatsapp') throw new Error('admin reply'); await sendWhatsAppText(op, text, { kind: 'inbox_alert' }); }
    catch { await trySendSms('inbox-reply-failed', op, text); }
  }
  return new NextResponse(null, { status: 204 });
}
