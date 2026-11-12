import 'server-only';
import TEMPLATES from './wa-templates.json';

/**
 * WhatsApp via Twilio.
 *  TWILIO_ACCOUNT_SID                     — AC… from the Twilio console home page
 *  TWILIO_API_KEY + TWILIO_API_SECRET     — SK… API key (preferred), or TWILIO_AUTH_TOKEN
 *  TWILIO_WHATSAPP_FROM                   — the WhatsApp sender, e.g. +15551234567
 *  OPERATOR_WHATSAPP                      — where operator alerts go, e.g. 972546677361
 *  TWILIO_TPL_*                           — Content SIDs (HX…) of the approved templates in lib/wa-templates.json
 *
 * WhatsApp only lets a business start a conversation with an approved template. When a template SID is
 * missing we fall back to plain text, which only arrives if that person messaged the number in the last 24h.
 */

export type TemplateKey = keyof typeof TEMPLATES;

const authPair = () => {
  const e = process.env;
  if (e.TWILIO_API_KEY && e.TWILIO_API_SECRET) return `${e.TWILIO_API_KEY}:${e.TWILIO_API_SECRET}`;
  if (e.TWILIO_AUTH_TOKEN) return `${e.TWILIO_ACCOUNT_SID}:${e.TWILIO_AUTH_TOKEN}`;
  return '';
};

export const waEnabled = () => !!(process.env.TWILIO_ACCOUNT_SID && authPair() && process.env.TWILIO_WHATSAPP_FROM);

/** 05XXXXXXXX / 9725XXXXXXXX / +9725… → +9725XXXXXXXX */
export function toE164(phone: string) {
  const d = phone.replace(/\D/g, '');
  if (d.startsWith('0')) return `+972${d.slice(1)}`;
  return `+${d}`;
}

/** WhatsApp rejects template variables with newlines, tabs or long runs of spaces, and empty ones. */
const cleanVar = (s: unknown) => String(s ?? '').replace(/[\r\n\t]+/g, ' · ').replace(/ {2,}/g, ' ').trim().slice(0, 900) || '—';

export function fillTemplate(key: TemplateKey, vars: unknown[]) {
  return TEMPLATES[key].body.replace(/\{\{(\d+)\}\}/g, (_, n) => cleanVar(vars[Number(n) - 1]));
}

/** Send one templated WhatsApp. Returns the Twilio message SID; throws on failure. */
export async function sendWhatsApp(to: string, key: TemplateKey, vars: unknown[], opts: { statusCallback?: string } = {}) {
  const env = process.env;
  if (!waEnabled()) throw new Error('twilio not configured');
  await throttle(to, key);
  const form = new URLSearchParams({ From: `whatsapp:${toE164(env.TWILIO_WHATSAPP_FROM!)}`, To: `whatsapp:${toE164(to)}` });
  const sid = env[TEMPLATES[key].env];
  if (sid) {
    form.set('ContentSid', sid);
    form.set('ContentVariables', JSON.stringify(Object.fromEntries(vars.map((v, i) => [String(i + 1), cleanVar(v)]))));
  } else {
    form.set('Body', fillTemplate(key, vars));
  }
  if (opts.statusCallback) form.set('StatusCallback', opts.statusCallback);
  return twilioPost(form);
}

/** Free-form text: only delivered inside the 24h window after that person last wrote to us. */
export async function sendWhatsAppText(to: string, body: string) {
  if (!waEnabled()) throw new Error('twilio not configured');
  await throttle(to, 'text');
  const form = new URLSearchParams({ From: `whatsapp:${toE164(process.env.TWILIO_WHATSAPP_FROM!)}`, To: `whatsapp:${toE164(to)}`, Body: body.slice(0, 1500) });
  return twilioPost(form);
}

/**
 * Per-recipient WhatsApp throttle: at most WA_MAX messages to one number per WA_WINDOW_SEC (default 4 per 10 minutes).
 * Meta locks senders that burst near-identical messages; extra sends are skipped (callers fall back to SMS / log it).
 * If the throttle check itself fails, the message is sent (an outage here must not silence lead alerts).
 */
const WA_MAX = Number(process.env.WA_MAX || 4), WA_WINDOW_SEC = Number(process.env.WA_WINDOW_SEC || 600);
async function throttle(to: string, kind: string) {
  const { db } = await import('./db');
  const { data, error } = await db().rpc('mm_wa_allow', { p_secret: process.env.MM_ADMIN_SECRET, p_phone: to, p_kind: kind, p_max: WA_MAX, p_window_sec: WA_WINDOW_SEC });
  if (error) { console.error('[whatsapp:throttle-check]', error.message); return; }
  if (data === false) throw new Error(`throttled: ${toE164(to)} already got ${WA_MAX} WhatsApp messages in ${WA_WINDOW_SEC / 60} min`);
}

export async function twilioPost(form: URLSearchParams) {
  const env = process.env;
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(authPair()).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  const j = (await r.json().catch(() => ({}))) as { sid?: string; message?: string; code?: number };
  if (!r.ok) throw new Error(`twilio ${r.status} ${j.code ?? ''} ${j.message ?? ''}`);
  return j.sid || '';
}

/** Same as sendWhatsApp but never throws: logs and reports success. */
export async function trySendWhatsApp(label: string, to: string, key: TemplateKey, vars: unknown[]) {
  if (!waEnabled() || !to) return false;
  try { await sendWhatsApp(to, key, vars); return true; } catch (e) { console.error(`[whatsapp:${label}]`, e); return false; }
}

/**
 * SMS via Twilio. Sender: TWILIO_SMS_FROM — an alphanumeric name (default "MoveMatch", max 11 chars, works for Israel)
 * or a Twilio number. Hebrew SMS are billed per 70-character segment, so keep texts short.
 */
export async function sendSms(to: string, body: string) {
  if (!(process.env.TWILIO_ACCOUNT_SID && authPair())) throw new Error('twilio not configured');
  const from = process.env.TWILIO_SMS_FROM || 'MoveMatch';
  return twilioPost(new URLSearchParams({ From: from, To: toE164(to), Body: body }));
}

export const smsEnabled = () => !!(process.env.TWILIO_ACCOUNT_SID && authPair()) && process.env.SMS_ENABLED !== '0';

export async function trySendSms(label: string, to: string, body: string) {
  if (!smsEnabled() || !to) return false;
  try { await sendSms(to, body); return true; } catch (e) { console.error(`[sms:${label}]`, e); return false; }
}

/** Is the approved template for this message configured? (Free-form text can't start a WhatsApp conversation.) */
export const hasTemplate = (key: TemplateKey) => !!process.env[TEMPLATES[key].env];
