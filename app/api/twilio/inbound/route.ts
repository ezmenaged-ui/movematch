import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse, after } from 'next/server';
import { db } from '@/lib/db';
import { sendAll, siteUrl } from '@/lib/notify';
import { messagesPaused } from '@/lib/pause';
import { sendWhatsAppText, trySendSms } from '@/lib/whatsapp';
import { displayPhone, inboxLink, Media, mediaAttachments, mediaFromParams, mediaProxyUrl, replyError, sendReply, windowLeftMs } from '@/lib/inbox';

export const maxDuration = 60;

/**
 * Twilio calls this when someone sends a WhatsApp message to the MoveMatch number.
 *  - "הסר" / "STOP" → switches a mover off the new-lead list and blocks further messages.
 *  - The operator replies to one of our alerts → the reply goes to that customer from the business number.
 *  - The operator writes anything else → nothing is sent on (it keeps the operator's 24h window open for alerts).
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
    after(() => sendAll(`🔕 ${data ? 'מוביל הוסר מהרשימה' : 'בקשת הסרה'} · ${local}`, `${name} (${local}) ביקש/ה להפסיק לקבל הודעות.${data ? '\nהמוביל סומן כלא פעיל בדף המובילים.' : ''}`));
    return twiml(messagesPaused() ? undefined : 'הוסרת מרשימת ההתראות של MoveMatch. כדי לחזור, כתבו לנו.');
  }

  if (isOperator) return fromOperator(params, digits, body, media, sid);

  // A customer or mover wrote to the business number.
  const { data: state } = await db().rpc('mm_inbox_state', { p_secret: secret, p_phone: digits });
  const st = (state || {}) as { last_in?: string; last_any?: string; op_last?: string };
  const { data: id, error } = await db().rpc('mm_inbox_add', { p_secret: secret, p_phone: digits, p_name: name, p_dir: 'in', p_body: body, p_media: media, p_sid: sid, p_via: null });
  if (error) console.error('[inbound:save]', error.message);
  if (!error && !id) return twiml(); // Twilio retried this webhook: already handled

  const now = Date.now();
  const firstInDay = !st.last_any || now - new Date(st.last_any).getTime() > 24 * 3600_000;
  const quietTenMin = !st.last_in || now - new Date(st.last_in).getTime() > 10 * 60_000;
  const who = name || displayPhone(digits);

  after(async () => {
    // 1. WhatsApp alert to the operator (only inside the operator's own 24h window; otherwise Meta refuses it).
    const preview = body || (media.length ? '📷 (קובץ מצורף)' : '(ללא טקסט)');
    let alerted = false;
    if (op && id && windowLeftMs(st.op_last) > 0) {
      const text = [`💬 ${who} · ${displayPhone(digits)}`, preview, media.length > 1 ? `(+${media.length - 1} קבצים נוספים בתיבת ההודעות)` : '',
        firstInDay ? '\n↩️ כדי לענות: לחיצה ארוכה על ההודעה הזו ← השב' : ''].filter(Boolean).join('\n');
      try {
        const alertSid = await sendWhatsAppText(op, text, {
          kind: 'inbox_alert',
          mediaUrl: media[0] ? mediaProxyUrl(media[0].url) : undefined,
          statusCallback: `${siteUrl()}/api/twilio/status?kind=inbox_alert&p=${digits}`,
        });
        await db().rpc('mm_inbox_set_alert', { p_secret: secret, p_id: id, p_alert_sid: alertSid });
        alerted = true;
      } catch (e) { console.error('[inbound:alert]', e instanceof Error ? e.message : e); }
    }
    // 2. No WhatsApp alert → SMS, once per burst (not for every message in a row from the same person).
    if (!alerted && op && quietTenMin) {
      await trySendSms('inbox-alert', op, [`הודעת ווטסאפ מ-${who} (${displayPhone(digits)}): ${preview.slice(0, 50)}`, `לקריאה ותשובה: ${inboxLink(digits)}`,
        windowLeftMs(st.op_last) ? '' : 'כדי לקבל את ההודעות בווטסאפ, שלח/י הודעה כלשהי למספר העסקי.'].filter(Boolean).join('\n'));
    }
    // 3. Email with the images attached.
    await sendAll(
      `💬 הודעת וואטסאפ ל-MoveMatch · ${who} · ${displayPhone(digits)}`,
      [`מאת: ${name || '—'} (${displayPhone(digits)})`, '', body || '(ללא טקסט)', media.length ? `\n+ ${media.length} קבצים מצורפים למייל` : '',
        '', `לקריאה ותשובה מהמספר העסקי: ${inboxLink(digits)}`].join('\n'),
      { event: 'inbound_whatsapp', from: local },
      { attachments: media.length ? await mediaAttachments(media, `whatsapp-${digits}`) : undefined },
    );
  });

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
