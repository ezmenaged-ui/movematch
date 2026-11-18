import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { db } from './db';
import { siteUrl } from './notify';
import { authPair, sendWhatsAppText } from './whatsapp';

/**
 * WhatsApp inbox (migration 024). Messages people send to the business number are saved, forwarded to the operator's
 * WhatsApp, and the operator answers by replying to that alert (or from /admin/inbox). Replies go out from the business number.
 *
 * Meta rules this code enforces:
 *  - Free-form messages only inside the 24h window after the person last wrote to us (WINDOW_MS, with a safety margin).
 *  - No bursts: every send goes through the per-recipient throttle in lib/whatsapp.ts.
 */

export const WINDOW_MS = 24 * 3600_000;
const SAFE_MS = WINDOW_MS - 10 * 60_000; // stop 10 minutes early so a slow send never lands outside the window

export type Media = { url: string; type: string };
export type InboxMsg = {
  id: string; created_at: string; phone: string; name: string | null; dir: 'in' | 'out';
  body: string; media: Media[]; sid: string | null; status: string | null; error: string | null; via: string | null;
};
export type Conversation = {
  phone: string; name: string | null; last_at: string; last_in: string | null;
  last_dir: 'in' | 'out'; last_body: string; last_media: number; n: number;
};

const secret = () => process.env.MM_ADMIN_SECRET;

/** 972501234567 → 050-1234567 (other countries: +1 555…). */
export function displayPhone(d: string) {
  if (/^9725\d{8}$/.test(d)) return `0${d.slice(3, 5)}-${d.slice(5)}`;
  if (/^972\d{8,9}$/.test(d)) return `0${d.slice(3)}`;
  return `+${d}`;
}

export const windowLeftMs = (lastIn: string | null | undefined, now = Date.now()) =>
  lastIn ? Math.max(0, new Date(lastIn).getTime() + SAFE_MS - now) : 0;

export function hoursText(ms: number) {
  const m = Math.round(ms / 60_000);
  if (m < 60) return `${m} דק׳`;
  const h = Math.floor(m / 60);
  return h === 1 ? 'שעה' : `${h} שעות`;
}

/** Media from inbound webhook params (MediaUrl0…, MediaContentType0…). Only Twilio's own media URLs are kept. */
export function mediaFromParams(params: URLSearchParams): Media[] {
  const n = Math.min(10, Number(params.get('NumMedia') || 0));
  const out: Media[] = [];
  for (let i = 0; i < n; i++) {
    const url = params.get(`MediaUrl${i}`) || '';
    if (isTwilioMedia(url)) out.push({ url, type: params.get(`MediaContentType${i}`) || 'application/octet-stream' });
  }
  return out;
}

const TWILIO_MEDIA = /^https:\/\/api\.twilio\.com\/2010-04-01\/Accounts\/AC[0-9a-f]{32}\/Messages\/(MM|SM)[0-9a-f]{32}\/Media\/ME[0-9a-f]{32}$/i;
export const isTwilioMedia = (u: string) => TWILIO_MEDIA.test(u);

const sign = (u: string) => createHmac('sha256', `mm-media:${secret() || ''}`).update(u).digest('base64url').slice(0, 32);

/** Public, unguessable link to a Twilio media file (Twilio media needs our credentials, so we proxy it). */
export const mediaProxyUrl = (u: string, base = siteUrl()) => `${base}/api/twilio/media?u=${encodeURIComponent(u)}&s=${sign(u)}`;

export function validMediaSig(u: string, s: string) {
  if (!secret() || !isTwilioMedia(u)) return false;
  const a = Buffer.from(sign(u)), b = Buffer.from(s || '');
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function fetchTwilioMedia(u: string) {
  if (!isTwilioMedia(u)) throw new Error('not a Twilio media URL');
  const r = await fetch(u, { headers: { Authorization: 'Basic ' + Buffer.from(authPair()).toString('base64') }, redirect: 'follow' });
  if (!r.ok) throw new Error(`twilio media ${r.status}`);
  return r;
}

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'video/mp4': 'mp4', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'application/pdf': 'pdf' };

/** Download inbound media for the email (max 15 MB in total, so Gmail accepts it). */
export async function mediaAttachments(media: Media[], label: string) {
  const out: { filename: string; content: Buffer; contentType: string }[] = [];
  let total = 0;
  for (const [i, m] of media.entries()) {
    try {
      const buf = Buffer.from(await (await fetchTwilioMedia(m.url)).arrayBuffer());
      if (total + buf.length > 15 * 1024 * 1024) break;
      total += buf.length;
      out.push({ filename: `${label}-${i + 1}.${EXT[m.type] || 'bin'}`, content: buf, contentType: m.type });
    } catch (e) { console.error('[inbox:attachment]', e instanceof Error ? e.message : e); }
  }
  return out;
}

export const inboxLink = (phone: string) => `${siteUrl()}/admin/inbox?p=${phone}`;

export type ReplyResult = { ok: true } | { ok: false; reason: 'window' | 'throttled' | 'failed'; detail?: string };

/**
 * Send the operator's reply to a customer from the business number, and save it.
 * Refuses (without sending) when the customer's 24h window is closed.
 */
export async function sendReply(phone: string, body: string, opts: { media?: Media; via: 'whatsapp' | 'admin' }): Promise<ReplyResult> {
  const text = body.trim();
  if (!text && !opts.media) return { ok: false, reason: 'failed', detail: 'הודעה ריקה' };
  const { data: st } = await db().rpc('mm_inbox_state', { p_secret: secret(), p_phone: phone });
  if (!windowLeftMs((st as { last_in?: string } | null)?.last_in)) return { ok: false, reason: 'window' };
  try {
    const sid = await sendWhatsAppText(phone, text, {
      kind: 'reply',
      mediaUrl: opts.media ? mediaProxyUrl(opts.media.url) : undefined,
      statusCallback: `${siteUrl()}/api/twilio/status?kind=inbox_out`,
    });
    await db().rpc('mm_inbox_add', { p_secret: secret(), p_phone: phone, p_name: null, p_dir: 'out', p_body: text, p_media: opts.media ? [opts.media] : [], p_sid: sid, p_via: opts.via });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[inbox:reply]', msg);
    return { ok: false, reason: msg.startsWith('throttled') ? 'throttled' : 'failed', detail: msg };
  }
}

/** Why a reply couldn't go out, in the operator's words. */
export function replyError(r: Exclude<ReplyResult, { ok: true }>, who: string, phone: string) {
  if (r.reason === 'window') return `⚠️ לא נשלח ל-${who}: עברו 24 שעות מההודעה האחרונה שלו/ה, ווטסאפ לא מאפשר לכתוב חופשי. אפשר להתקשר: ${displayPhone(phone)}`;
  if (r.reason === 'throttled') return `⚠️ לא נשלח ל-${who}: יותר מדי הודעות ברצף (מגבלת הגנה על המספר). נסה/י שוב בעוד כמה דקות.`;
  return `⚠️ לא נשלח ל-${who}. ${r.detail ? `(${r.detail.slice(0, 120)})` : ''}`.trim();
}
