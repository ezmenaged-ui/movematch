import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse, after } from 'next/server';
import { db } from '@/lib/db';
import { sendAll } from '@/lib/notify';

/**
 * Twilio calls this when someone sends a WhatsApp message to the MoveMatch number.
 *  - "הסר" / "STOP" from a mover → switches them off the new-lead list.
 *  - Anything else → forwarded to the operator by email, and the sender gets a link to the operator's personal WhatsApp.
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
  if (!authorized(req, params)) return new NextResponse('forbidden', { status: 403 });

  const from = (params.get('From') || '').replace(/^whatsapp:/, '');
  const local = from.replace(/^\+972/, '0');
  const body = (params.get('Body') || '').trim();
  const name = params.get('ProfileName') || '';
  const media = Number(params.get('NumMedia') || 0);
  const op = process.env.OPERATOR_WHATSAPP || '';
  const isOperator = op && from.replace(/\D/g, '') === op.replace(/\D/g, '');

  if (STOP.test(body)) {
    const { data } = await db().rpc('mm_mover_opt_out', { p_secret: process.env.MM_ADMIN_SECRET, p_phone: local });
    after(() => sendAll(`🔕 ${data ? 'מוביל הוסר מהרשימה' : 'בקשת הסרה'} · ${local}`, `${name} (${local}) ביקש/ה להפסיק לקבל הודעות.${data ? '\nהמוביל סומן כלא פעיל בדף המובילים.' : ''}`));
    return twiml('הוסרת מרשימת ההתראות של MoveMatch. כדי לחזור, כתבו לנו.');
  }

  if (isOperator) return twiml(); // the operator messaging the bot (keeps the 24h window open): nothing to do

  after(() => sendAll(
    `💬 הודעת וואטסאפ ל-MoveMatch · ${name} · ${local}`,
    [`מאת: ${name} (${local})`, `וואטסאפ: https://wa.me/${from.replace(/\D/g, '')}`, '', body || '(ללא טקסט)', media ? `\n+ ${media} קבצים מצורפים (לצפייה ב-Twilio)` : ''].join('\n'),
    { event: 'inbound_whatsapp', from: local },
  ));
  return twiml(op
    ? `תודה! ההודעה הועברה לצוות MoveMatch. לשיחה ישירה איתנו: https://wa.me/${op}`
    : 'תודה! ההודעה הועברה לצוות MoveMatch ונחזור אליך בהקדם.');
}
