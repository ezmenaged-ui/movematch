import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse, after } from 'next/server';
import { db } from '@/lib/db';
import { sendAll } from '@/lib/notify';
import { messagesPaused } from '@/lib/pause';
import { displayPhone, forwardToOperator, InboxState, Media, mediaFromParams, replyError, sendReply } from '@/lib/inbox';
import { funnelFor, handleFunnelMessage, stopFunnel } from '@/lib/waFunnel';

export const maxDuration = 60;

/**
 * Twilio calls this when someone sends a WhatsApp message to the MoveMatch number.
 *  - "הסר" / "STOP" → switches a mover off the new-lead list and blocks further messages.
 *  - The operator replies to one of our alerts → the reply goes to that customer from the business number.
 *  - The operator writes anything else → nothing is sent on (it keeps the operator's 24h window open for alerts).
 *  - A WhatsApp funnel chat (funnel F: started from the ad's starter message, see lib/waFunnel.ts) → the bot answers.
 *  - Anyone else → saved to the inbox (/admin/inbox), forwarded to the operator's WhatsApp (SMS if that isn't possible)
 *    and by email with the images attached. The first message of a conversation gets a short automatic "thanks".
 * See lib/inbox.ts for the WhatsApp 24h rule and throttling.
 */
const STOP = /^\s*(הסר|הסרה|להסיר|stop|unsubscribe)\s*[.!]?\s*$/i;

/** Accept the request if it carries the secret ?k= set in the Twilio webhook URL, or a valid Twilio signature. */
function authorized(req: NextRequest, params: URLSearchParams) {
  const key = process.env.TWILIO_WEBHOOK_KEY;
  const k = req.nextUrl.searchParams.get('k') || '';
  if (key && k.length === key.length && timingSafeEqual(Buffer.from(k), Buffer.from(key))) return true;
  return validSignature(req, params);
}

function validSignature(req: NextRequest, params: URLSearchParams) {
  const token = process.env.TWILIO_AUTH_TOKEN;
  const sig = req.headers.get('x-twilio-signature') || '';
  if (!token || !sig) return false;
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const url = `https://${host}${req.nextUrl.pathname}${req.nextUrl.search}`;
  const data = url + [...params.keys()].sort().map((k) => k + params.getAll(k).join('')).join('');
  const expected = createHmac('sha1', token).update(data, 'utf8').digest('base64');
  const a = Buffer.from(expected), b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const twiml = (msg?: string) => new NextResponse(
  `<?xml version="1.0" encoding="UTF-8"?><Response>${msg ? `<Message>${esc(msg)}</Message>` : ''}</Response>`,
  { headers: { 'Content-Type': 'text/xml' } },
);

export async function POST(req: NextRequest) {
  const params = new URLSearchParams(await req.text());
  if (!authorized(req, params)) {
    // No secrets in the log: just enough to see why Twilio's call was refused.
    console.warn('[inbound] refused', JSON.stringify({ host: req.headers.get('x-forwarded-host') || req.headers.get('host'), key: req.nextUrl.searchParams.has('k'),
      keySet: !!process.env.TWILIO_WEBHOOK_KEY, sig: !!req.headers.get('x-twilio-signature'), tokenSet: !!process.env.TWILIO_AUTH_TOKEN, from: (params.get('From') || '').slice(-4) }));
    return new NextResponse('forbidden', { status: 403 });
  }

  const from = (params.get('From') || '').replace(/^whatsapp:/, '');
  const digits = from.replace(/\D/g, '');
  const local = from.replace(/^\+972/, '0');
  const body = (params.get('Body') || '').trim();
  const name = params.get('ProfileName') || '';
  const sid = params.get('MessageSid') || params.get('SmsMessageSid') || '';
  const media = mediaFromParams(params);
  const op = (process.env.OPERATOR_WHATSAPP || '').replace(/\D/g, '');
  const isOperator = op && digits === op;
  const secret = process.env.MM_ADMIN_SECRET;

  if (STOP.test(body)) {
    const { data } = await db().rpc('mm_mover_opt_out', { p_secret: secret, p_phone: local });
    await stopFunnel(digits);
    after(() => sendAll(`🔕 ${data ? 'מוביל הוסר מהרשימה' : 'בקשת הסרה'} · ${local}`, `${name} (${local}) ביקש/ה להפסיק לקבל הודעות.${data ? '\nהמוביל סומן כלא פעיל בדף המובילים.' : ''}`));
    return twiml(messagesPaused() ? undefined : 'הוסרת מרשימת ההתראות של MoveMatch. כדי לחזור, כתבו לנו.');
  }

  // The operator can test the WhatsApp funnel from their own phone (always as a QA test lead) by sending a starter message.
  if (isOperator && !params.get('OriginalRepliedMessageSid')) {
    const f = await funnelFor(digits, body);
    if (f && !(f as { afterDone?: boolean }).afterDone) {
      await db().rpc('mm_inbox_add', { p_secret: secret, p_phone: digits, p_name: null, p_dir: 'op', p_body: '', p_media: [], p_sid: sid, p_via: null });
      after(() => handleFunnelMessage({ digits, name, body, media, inboxId: '', st: {}, state: f, operator: true }));
      return twiml();
    }
  }
  if (isOperator) return fromOperator(params, digits, body, media, sid);

  // A customer or mover wrote to the business number.
  const { data: state } = await db().rpc('mm_inbox_state', { p_secret: secret, p_phone: digits });
  const st = (state || {}) as InboxState;
  const { data: id, error } = await db().rpc('mm_inbox_add', { p_secret: secret, p_phone: digits, p_name: name, p_dir: 'in', p_body: body, p_media: media, p_sid: sid, p_via: null });
  if (error) console.error('[inbound:save]', error.message);
  if (!error && !id) return twiml(); // Twilio retried this webhook: already handled

  // WhatsApp funnel F: a chat started from the ad's starter message, or one already running → the bot answers.
  if (id) {
    const f = await funnelFor(digits, body);
    if (f) {
      after(() => handleFunnelMessage({ digits, name, body, media, inboxId: String(id), st, state: f }));
      return twiml();
    }
  }

  const firstInDay = !st.last_any || Date.now() - new Date(st.last_any).getTime() > 24 * 3600_000;
  after(() => forwardToOperator({ digits, name, body, media, id: id ? String(id) : null, st }));

  // Automatic "thanks" only on the first message of a conversation (repeating it on every message looks like spam).
  return twiml(firstInDay && !messagesPaused() ? 'תודה! קיבלנו את ההודעה ונחזור אליך כאן בהקדם. צוות MoveMatch' : undefined);
}

/** The operator wrote to the business number from their own WhatsApp. */
async function fromOperator(params: URLSearchParams, digits: string, body: string, media: Media[], sid: string) {
  const secret = process.env.MM_ADMIN_SECRET;
  await db().rpc('mm_inbox_add', { p_secret: secret, p_phone: digits, p_name: null, p_dir: 'op', p_body: '', p_media: [], p_sid: sid, p_via: null });
  const replied = params.get('OriginalRepliedMessageSid') || '';
  if (!replied) {
    return twiml(messagesPaused() ? undefined
      : '✓ ההתראות בווטסאפ פעילות ל-24 השעות הקרובות.\nכדי לענות ללקוח: לחיצה ארוכה על ההתראה שלו ← השב.');
  }
  const { data } = await db().rpc('mm_inbox_by_alert', { p_secret: secret, p_alert_sid: replied });
  const to = data as { phone: string; name: string | null } | null;
  if (!to) return twiml('לא מצאתי לאיזה לקוח זו תשובה. יש להשיב על ההתראה של הלקוח (לחיצה ארוכה ← השב), או לענות מתיבת ההודעות באתר.');
  const r = await sendReply(to.phone, body, { media: media[0], via: 'whatsapp' });
  if (r.ok) return twiml(media.length > 1 ? 'נשלח קובץ אחד בלבד. כל קובץ נוסף: הודעה נפרדת.' : undefined);
  return twiml(replyError(r, to.name || displayPhone(to.phone), to.phone));
}
