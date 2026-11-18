import 'server-only';
import { db, LeadRow, phoneRecent } from './db';
import { notifyLead, siteUrl } from './notify';
import { onLeadComplete } from './automations';
import { cleanLeadInput } from './sanitize';
import { areasOfCity } from './areas';
import { CITIES, PARKING_OPTIONS, normalizePhone, type Address, type When } from './validate';
import { fetchTwilioMedia, forwardToOperator, windowLeftMs, type InboxState, type Media } from './inbox';
import { sendWhatsAppText } from './whatsapp';
import { messagesPaused } from './pause';
import { waFunnelLive } from './qa';
import { readAnswer, type AddrPatch, type Reading } from './waAi';
import { gaEvent } from './gaServer';

/**
 * Funnel F: the whole funnel as a WhatsApp chat.
 *
 * The Google Ads message asset opens WhatsApp with a starter message already typed (e.g. "היי, אני רוצה הצעת מחיר להובלה #G1").
 * The customer taps send; that message opens WhatsApp's 24h window, so everything the bot sends is a free-form reply (no templates).
 * The bot then asks the funnel questions one at a time: from → to → when → video → name. Claude (lib/waAi.ts) reads the
 * free-text answers; only what is still missing is asked again. When the chat is done the lead is completed exactly like
 * funnels B–E (tender opened, movers in the area alerted, operator alert), and the tender link is sent in the chat.
 *
 * Rules kept here (see CLAUDE.md → WhatsApp rules):
 *  - The bot only answers messages: one reply per customer message. Reminders: at most 2 per chat, at 20:30 and then 10:00
 *    (Israel time), and only inside the 24h window after the customer's last message.
 *  - "הסר"/STOP ends the chat (app/api/twilio/inbound). Asking for a person hands the chat to the operator's inbox.
 *  - A starter that begins with "QA" (or any chat from the operator's own number) is a test: the lead is a QA test lead,
 *    so no mover is messaged (lib/qa.ts).
 */

type Side = 'from' | 'to';
type AddrField = 'city' | 'address' | 'floor' | 'elevator' | 'elevator_type' | 'crane' | 'parking';
export type Step = 'from' | 'to' | 'when' | 'video' | 'name' | 'done';
type Data = {
  from?: Partial<Address>; to?: Partial<Address>; when?: Partial<When>;
  ask?: string;            // the question the bot is waiting for: 'from' (opener), 'from.floor', 'when', 'video', 'name', …
  name?: string; profile?: string;
  video_refusals?: number; videos?: number;
};
export type FunnelState = {
  phone: string; lead_id: string | null; lead_token: string | null; step: Step; data: Data; source: string | null;
  test: boolean; status: 'active' | 'done' | 'handoff' | 'stopped'; last_in: string; reminders: number;
};

const secret = () => process.env.MM_ADMIN_SECRET;
/** furthest_step on the lead (1 = chat opened). GA4 funnel_step names: 1_start 2_to 3_when 4_video 5_name 6_done (each when that question is reached). */
const STEP_NO: Record<Step, number> = { from: 1, to: 2, when: 3, video: 4, name: 5, done: 6 };
const GA_NAME: Record<Step, string> = { from: 'start', to: 'to', when: 'when', video: 'video', name: 'name', done: 'done' };

// ── Starter message ────────────────────────────────────────────────────────────────────────────────────────────────
/** The ad's starter message: mentions a move and a price/offer, or carries an ad-group code like "#G1". */
const CODE = /#([A-Za-z]{1,3}\d{0,3})\b/;
export const isStarter = (body: string) => CODE.test(body) || (/הובל/.test(body) && /(הצע|מחיר)/.test(body) && body.length <= 120);
const isQaStarter = (body: string) => /^\s*QA\b/i.test(body);

/** Is this message for the bot? Returns the chat state to continue (or a fresh one to start), null for the normal inbox. */
export async function funnelFor(digits: string, body: string): Promise<FunnelState | null> {
  const { data, error } = await db().rpc('mm_wa_funnel_get', { p_secret: secret(), p_phone: digits });
  if (error) { console.error('[wa-funnel] get (migration 026 applied?)', error.message); return null; }
  const st = data as FunnelState | null;
  if (st?.status === 'active') return st;
  if (isStarter(body)) return { phone: digits, lead_id: null, lead_token: null, step: 'from', data: {}, source: null, test: false, status: 'active', last_in: new Date().toISOString(), reminders: 0, isNew: true } as FunnelState & { isNew: true };
  // A video sent after the chat finished: add it to the lead.
  if (st?.status === 'done' && st.lead_id) return { ...st, afterDone: true } as FunnelState & { afterDone: true };
  return null;
}

/** "הסר" / STOP: the bot stops (no more questions or reminders). */
export async function stopFunnel(digits: string) {
  const { data } = await db().rpc('mm_wa_funnel_get', { p_secret: secret(), p_phone: digits });
  if ((data as FunnelState | null)?.status === 'active') await save(digits, { status: 'stopped', next_reminder_at: null });
}

// ── Questions ──────────────────────────────────────────────────────────────────────────────────────────────────────
const PARKING_Q = ['כמה רחוק המשאית יכולה לחנות מהכניסה לבניין? (כתבו מספר)', ...PARKING_OPTIONS.map((o, i) => `${i + 1}. ${o.label}`)].join('\n');
const FIELD_Q: Record<AddrField, (s: Side) => string> = {
  city: (s) => (s === 'from' ? 'מאיזו עיר עוברים?' : 'לאיזו עיר עוברים?'),
  address: () => 'מה הרחוב ומספר הבית?',
  floor: () => 'באיזו קומה הדירה? (קרקע = 0)',
  elevator: () => 'יש מעלית בבניין? (כן / לא) אם כן, היא קטנה, בינונית או גדולה?',
  elevator_type: () => 'מה גודל המעלית: קטנה, בינונית או גדולה?',
  crane: () => 'אפשר להשתמש במנוף בכתובת הזו? (כן / לא / לא יודעים)',
  parking: () => PARKING_Q,
};
const OPENER: Record<Side, string> = {
  from: '*מאיפה עוברים?*\nכתבו בהודעה אחת: עיר, רחוב ומספר, קומה, והאם יש מעלית.',
  to: '*ולאן עוברים?*\nעיר, רחוב ומספר, קומה, והאם יש מעלית.',
};
const WHEN_Q = '*מתי ההובלה?*\nאפשר תאריך (למשל 15/12), "סוף החודש" או "גמיש". אם יש העדפה לבוקר / צהריים / אחה״צ, כתבו גם.';
const VIDEO_Q = '*כמעט סיימנו 🎥*\nצלמו סרטון קצר שעובר על כל החדרים (עד 3 דקות, עם ארונות פתוחים) ושלחו אותו כאן.\nכך המובילים נותנים מחיר מדויק בלי לבוא לראות את הדירה.';
const NAME_Q = 'ועל איזה שם לרשום את הבקשה?';
const TIME_Q = 'באיזה חלק של היום מתאים להתחיל? בוקר (7–11), צהריים (11–15), אחר הצהריים (15–19), או "לא משנה".';
const LABEL: Record<AddrField, string> = { city: 'city', address: 'street and house number', floor: 'floor', elevator: 'elevator (and its size)', elevator_type: 'elevator size', crane: 'crane', parking: 'truck parking distance' };

function missing(a: Partial<Address> | undefined): AddrField | null {
  if (!a?.city) return 'city';
  if (!a.address) return 'address';
  if (!a.floor) return 'floor';
  if (a.elevator == null) return 'elevator';
  if (a.elevator && !a.elevator_type) return 'elevator_type';
  if (!a.crane) return 'crane';
  if (!a.parking) return 'parking';
  return null;
}

// Closed questions are sent with tap buttons / a pick-list (Twilio Content, session-only: no Meta approval needed).
// Created in Twilio on 18 Nov 2026 (friendly names mm_chat_*); the button ids come back as ButtonPayload / ListId.
const BUTTONS: Partial<Record<AddrField | 'time', { sid: string; text: string }>> = {
  elevator: { sid: 'HXfddbc2c06c6da654f9b404874f5f7b86', text: 'יש מעלית בבניין?' },             // elev_yes / elev_no
  elevator_type: { sid: 'HXa5251204d878ae4fdbcdc72b7944d91a', text: 'מה גודל המעלית?' },           // size_small / size_regular / size_large
  crane: { sid: 'HX78c49363103cab8d4ac28c24e17d40d3', text: 'אפשר להשתמש במנוף בכתובת הזו?' },   // crane_yes / crane_no / crane_unknown
  parking: { sid: 'HXf73d12558cf6fb8f54fbf9550a2b723c', text: 'כמה רחוק המשאית יכולה לחנות מהכניסה לבניין? לחצו על "בחירת מרחק".' }, // park_p10 … park_far
  time: { sid: 'HX4e8edb220bf99e3a8308861c8f943be1', text: 'באיזה חלק של היום מתאים להתחיל? לחצו על "בחירת שעה".' }, // time_morning / time_noon / time_afternoon / time_any
};
const buttonsFor = (ask: string | undefined) => BUTTONS[(ask || '').split('.')[1] as AddrField | 'time'];

/** Send the question the bot is waiting for, after an optional prefix (buttons when the question has them). */
async function sayQuestion(digits: string, prefix: string, ask: string | undefined) {
  const b = buttonsFor(ask);
  const plain = `${prefix}${questionText(ask)}`.trim(); // also the fallback if Twilio refuses the buttons
  return b ? say(digits, `${prefix}${b.text}`.trim(), { sid: b.sid, fallback: plain }) : say(digits, plain);
}

/** Taps on the buttons / pick-list: the answer, without asking Claude. */
function buttonAnswer(payload: string): Partial<Address> | null {
  const [k, v] = payload.split('_');
  if (k === 'elev') return v === 'yes' ? { elevator: true } : v === 'no' ? { elevator: false, elevator_type: '' } : null;
  if (k === 'size' && ['small', 'regular', 'large'].includes(v)) return { elevator: true, elevator_type: v as Address['elevator_type'] };
  if (k === 'crane' && ['yes', 'no', 'unknown'].includes(v)) return { crane: v as Address['crane'] };
  if (k === 'park' && PARKING_OPTIONS.some((o) => o.v === v)) return { parking: v as Address['parking'] };
  return null;
}
const timeAnswer = (payload: string): Partial<When> | null =>
  payload === 'time_any' ? { time: '', time_flexible: true }
  : ['time_morning', 'time_noon', 'time_afternoon'].includes(payload) ? { time: payload.slice(5) as When['time'], time_flexible: false } : null;

// ── Simple answers are read by plain code (no AI cost); only free text that doesn't fit goes to Claude ─────────────
const tidy = (t: string) => t.trim().replace(/[.!,\s]+$/u, '').replace(/\s+/g, ' ');
function quickAddress(field: AddrField, raw: string): Partial<Address> | null {
  const t = tidy(raw);
  if (field === 'floor') { const m = t.match(/^(?:קומה\s*)?(-?\d{1,2})$/); return m ? { floor: m[1] } : /^(קומת )?קרקע$/.test(t) ? { floor: '0' } : null; }
  if (field === 'city') return (CITIES as string[]).includes(t) ? { city: t } : null; // abbreviations (ת"א) go to Claude, which writes the full name
  if (field === 'address') return /^[א-ת"'׳״ .-]{2,30} \d{1,4}[א-ת]?$/.test(t) ? { address: t } : null;
  if (field === 'elevator' || field === 'elevator_type') {
    const sz = /^(מעלית )?(קטנה)$/.test(t) ? 'small' : /^(מעלית )?(בינונית|רגילה)$/.test(t) ? 'regular' : /^(מעלית )?(גדולה)$/.test(t) ? 'large' : null;
    if (sz) return { elevator: true, elevator_type: sz };
    if (field === 'elevator' && /^(כן|יש|יש מעלית)$/.test(t)) return { elevator: true };
    if (field === 'elevator' && /^(לא|אין|אין מעלית|רק מדרגות|מדרגות)$/.test(t)) return { elevator: false, elevator_type: '' };
    return null;
  }
  if (field === 'crane') return /^(כן|אפשר)$/.test(t) ? { crane: 'yes' } : /^(לא|אי אפשר)$/.test(t) ? { crane: 'no' } : /^לא יודע(ת|ים)?$/.test(t) ? { crane: 'unknown' } : null;
  if (field === 'parking') { const m = t.match(/^[1-5]$/); return m ? { parking: PARKING_OPTIONS[Number(m[0]) - 1].v } : null; }
  return null;
}
function quickWhen(raw: string): Partial<When> | null {
  const t = tidy(raw);
  if (/^(גמיש|גמישים|לא יודע(ת|ים)?( עדיין)?|עוד לא יודע(ת|ים)?)$/.test(t)) return { date: '', date_flexible: true, time: '', time_flexible: true };
  return /^\d{1,2}[./]\d{1,2}([./]\d{2,4})?( (ב)?(בוקר|צהריים|אחה"?צ|אחר הצהריים))?$/.test(t) ? fallbackWhen(t) : null;
}
function quickTime(raw: string): Partial<When> | null {
  const t = tidy(raw);
  if (/^(ב)?בוקר$/.test(t)) return { time: 'morning', time_flexible: false };
  if (/^(ב)?צהריים$/.test(t)) return { time: 'noon', time_flexible: false };
  if (/^(אחה"?צ|אחר הצהריים|ערב)$/.test(t)) return { time: 'afternoon', time_flexible: false };
  if (/^(לא משנה|גמיש|כל שעה|לא חשוב)$/.test(t)) return { time: '', time_flexible: true };
  return null;
}
const quickName = (raw: string) => { const t = tidy(raw); return /^[\p{L}'"׳״ -]{2,40}$/u.test(t) && t.split(' ').length <= 4 ? t : null; };

/** The text of the question the bot is waiting for (also used by reminders). */
export function questionText(ask: string | undefined): string {
  if (!ask || ask === 'from' || ask === 'to') return OPENER[(ask as Side) || 'from'];
  if (ask === 'when.time') return TIME_Q;
  const [side, field] = ask.split('.') as [Side, AddrField];
  if (field && FIELD_Q[field]) return FIELD_Q[field](side);
  return ask === 'when' ? WHEN_Q : ask === 'video' ? VIDEO_Q : ask === 'name' ? NAME_Q : OPENER.from;
}

// ── State ──────────────────────────────────────────────────────────────────────────────────────────────────────────
async function save(digits: string, p: Record<string, unknown>) {
  const { data, error } = await db().rpc('mm_wa_funnel_save', { p_secret: secret(), p_phone: digits, p });
  if (error) console.error('[wa-funnel] save', error.message);
  return data as FunnelState | null;
}

/** Per-phone lease, so a text and a video sent together are handled one after the other. */
async function lock(digits: string) {
  for (let i = 0; i < 25; i++) {
    const { data, error } = await db().rpc('mm_wa_funnel_lock', { p_secret: secret(), p_phone: digits });
    if (error || data !== false) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
}

/** Bot message: sent as a reply in the open 24h window, and saved to the inbox (/admin/inbox shows the whole chat). */
async function say(digits: string, text: string, buttons?: { sid: string; fallback: string }) {
  if (messagesPaused()) { console.warn('[paused] wa-funnel reply skipped'); return false; }
  try {
    const opts = { kind: 'chat', chat: true, statusCallback: `${siteUrl()}/api/twilio/status?kind=inbox_out` };
    let sid = '';
    if (buttons) {
      try { sid = await sendWhatsAppText(digits, text, { ...opts, contentSid: buttons.sid }); }
      catch (e) { console.error('[wa-funnel] buttons refused, sending text', e instanceof Error ? e.message : e); }
    }
    if (!sid) { text = buttons ? buttons.fallback : text; sid = await sendWhatsAppText(digits, text, opts); }
    await db().rpc('mm_inbox_add', { p_secret: secret(), p_phone: digits, p_name: null, p_dir: 'out', p_body: text, p_media: [], p_sid: sid, p_via: 'bot' });
    return true;
  } catch (e) { console.error('[wa-funnel] send', e instanceof Error ? e.message : e); return false; }
}

// ── Time (Israel) ──────────────────────────────────────────────────────────────────────────────────────────────────
const TZ = 'Asia/Jerusalem';
const offsetMin = (d: Date) => {
  const s = new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'longOffset' }).formatToParts(d).find((p) => p.type === 'timeZoneName')?.value || 'GMT+02:00';
  const m = s.match(/GMT([+-])(\d{2}):?(\d{2})?/);
  return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] || 0)) : 120;
};
const israelDate = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d); // YYYY-MM-DD
const todayText = () => `${israelDate(new Date())} (${new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'long' }).format(new Date())})`;

/** The next hh:mm Israel time that is at least 30 minutes from `after`. */
function nextAt(hh: number, mm: number, after: Date) {
  for (let day = 0; day < 3; day++) {
    const [y, mo, d] = israelDate(new Date(after.getTime() + day * 86400_000)).split('-').map(Number);
    const guess = new Date(Date.UTC(y, mo - 1, d, hh, mm));
    const t = new Date(guess.getTime() - offsetMin(guess) * 60_000);
    if (t.getTime() >= after.getTime() + 30 * 60_000) return t;
  }
  return null;
}

/**
 * Reminders go out at 20:30 or 10:00 Israel time (whichever comes first, at least 30 minutes after the last message),
 * at most 2 per chat, and only inside the 24h window after the customer's last message (Meta allows free-form only then).
 * Example: stopped at 18:00 → 20:30, then 10:00 next morning. Stopped at 10:00 → 20:30 only (10:00 next day is 24h later).
 */
export function nextReminder(lastIn: string, sent: number, now = new Date()) {
  if (sent >= 2) return null;
  const base = new Date(Math.max(now.getTime(), new Date(lastIn).getTime()));
  const t = [nextAt(20, 30, base), nextAt(10, 0, base)].filter((x): x is Date => !!x).sort((x, y) => x.getTime() - y.getTime())[0];
  return t && windowLeftMs(lastIn, t.getTime()) > 0 ? t.toISOString() : null;
}

// ── Fallback parser (no AI key, or the AI call failed) ────────────────────────────────────────────────────────────
const yesNo = (t: string) => (/לא\s*יודע|אין\s*לי\s*מושג/.test(t) ? 'unknown' : /^(לא|אין)\b|בלי|מדרגות/.test(t.trim()) ? 'no' : /^(כן|יש|בטח|אפשר)/.test(t.trim()) ? 'yes' : null);
const size = (t: string) => (/קטנ/.test(t) ? 'small' : /גדול/.test(t) ? 'large' : /בינונ|רגיל/.test(t) ? 'regular' : null);

function fallbackAddress(t: string, field: AddrField | null): Partial<AddrPatch> {
  const p: Partial<AddrPatch> = {};
  if (!field) { // opener: try to pick out what we can
    const city = [...CITIES].sort((a, b) => b.length - a.length).find((c) => t.includes(c)) || (areasOfCity(t.split(/[,\n]/)[0]).length ? t.split(/[,\n]/)[0].trim() : '');
    if (city) p.city = city;
    const floor = t.match(/קומה\s*(-?\d+)/)?.[1] ?? (/קרקע/.test(t) ? '0' : null);
    if (floor != null) p.floor = floor;
    const street = t.replace(city, '').split(/[,\n]/).map((s) => s.trim()).find((s) => /[א-ת]+\s*\d+/.test(s) && !/קומה|מעלית/.test(s));
    if (street) p.address = street;
    if (/אין\s*מעלית|בלי\s*מעלית|מדרגות/.test(t)) p.elevator = false; else if (/מעלית/.test(t)) { p.elevator = true; p.elevator_type = size(t); }
    return p;
  }
  const v = t.trim().slice(0, 120);
  if (field === 'city' || field === 'address') p[field] = v;
  if (field === 'floor') { const f = v.match(/-?\d+/)?.[0] ?? (/קרקע/.test(v) ? '0' : null); if (f != null) p.floor = f; }
  if (field === 'elevator') { const yn = yesNo(v); if (yn === 'no') p.elevator = false; else if (yn === 'yes' || size(v)) { p.elevator = true; p.elevator_type = size(v); } }
  if (field === 'elevator_type') p.elevator_type = size(v);
  if (field === 'crane') p.crane = yesNo(v) as AddrPatch['crane'];
  if (field === 'parking') { const n = Number(v.match(/[1-5]/)?.[0]); if (n) p.parking = PARKING_OPTIONS[n - 1].v; }
  return p;
}

function fallbackWhen(t: string): Partial<When> | null {
  if (/גמיש|לא יודע|עוד לא/.test(t)) return { date: '', date_flexible: true, time: '', time_flexible: true };
  const m = t.match(/(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?/);
  if (!m) return null;
  const now = new Date(israelDate(new Date()) + 'T12:00:00Z');
  let y = m[3] ? Number(m[3].length === 2 ? '20' + m[3] : m[3]) : now.getUTCFullYear();
  let d = new Date(Date.UTC(y, Number(m[2]) - 1, Number(m[1]), 12));
  if (!m[3] && d < now) d = new Date(Date.UTC(++y, Number(m[2]) - 1, Number(m[1]), 12));
  if (Number.isNaN(d.getTime())) return null;
  return { date: d.toISOString().slice(0, 10), date_flexible: false, time: /בוקר/.test(t) ? 'morning' : /צהר/.test(t) ? 'noon' : /אחה|ערב/.test(t) ? 'afternoon' : '', time_flexible: false };
}

const cleanName = (s: string | null | undefined) => (s || '').replace(/[^\p{L}\p{M}\s'"׳״-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 60);

// ── Lead ───────────────────────────────────────────────────────────────────────────────────────────────────────────
type Ctx = { digits: string; local: string; st: FunnelState; profile: string };

/** Create the lead on the first answer (this also runs the 30-day phone rule). */
async function ensureLead(c: Ctx): Promise<'ok' | 'recent' | 'invalid'> {
  if (c.st.lead_id) return 'ok';
  if (!/^05\d{8}$/.test(c.local)) return 'invalid';
  const name = (c.st.test ? 'QA וואטסאפ ' : '') + (cleanName(c.profile) || 'לקוח וואטסאפ');
  const { data, error } = await db().rpc('mm_create_lead', { p: {
    variant: 'chat', name, phone: c.local, status: 'partial', furthest_step: 1,
    utm_source: c.st.test ? 'qa' : 'whatsapp', utm_medium: 'google_ads_message', utm_campaign: c.st.source || null,
    user_agent: 'whatsapp-chat',
    // Held from movers while funnel F is being tested (see lib/qa.ts → waFunnelLive).
    ...(waFunnelLive() ? {} : { entry: 'home' }),
  } });
  if (phoneRecent(error)) return 'recent';
  if (error || !data) { console.error('[wa-funnel] create lead', error); return 'invalid'; }
  const { id, token } = data as { id: string; token: string };
  c.st.lead_id = id; c.st.lead_token = token;
  await save(c.digits, { lead_id: id, lead_token: token });
  ga(c, 'generate_lead', {});
  return 'ok';
}

async function updateLead(c: Ctx, fields: Record<string, unknown>) {
  if (!c.st.lead_id) return null;
  const { data, error } = await db().rpc('mm_update_lead', { p_id: c.st.lead_id, p_token: c.st.lead_token, p: cleanLeadInput(fields) });
  if (error) console.error('[wa-funnel] update lead', error.message);
  return (data || null) as LeadRow | null;
}

function ga(c: Ctx, event: string, params: Record<string, unknown>) {
  if (c.st.test) return; // keep GA4 reports clean
  void gaEvent(c.digits, event, { funnel: 'f', theme: 'whatsapp', variant_id: 'f-whatsapp', ad_group: c.st.source || '', ...params });
}
const step = (c: Ctx, s: Step) => ga(c, 'funnel_step', { step_number: STEP_NO[s], step_name: `${STEP_NO[s]}_${GA_NAME[s]}` });

/** Download a WhatsApp video from Twilio and store it with the lead (same bucket and format as web uploads). */
async function storeVideo(c: Ctx, m: Media) {
  if (!c.st.lead_id) return false;
  try {
    const buf = Buffer.from(await (await fetchTwilioMedia(m.url)).arrayBuffer());
    const ext = m.type.includes('quicktime') ? 'mov' : m.type.includes('3gpp') ? '3gp' : 'mp4';
    const path = `${c.st.lead_id}/${Date.now()}-wa.${ext}`;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/movematch-videos/${path}`, {
      method: 'POST',
      headers: { apikey: key, ...(key.startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {}), 'Content-Type': m.type, 'x-upsert': 'false' },
      body: buf,
    });
    if (!r.ok) throw new Error(`storage ${r.status} ${(await r.text()).slice(0, 200)}`);
    await updateLead(c, { add_video: { path, parts: 1, size: buf.length, name: 'וואטסאפ' } });
    return true;
  } catch (e) { console.error('[wa-funnel] video', e instanceof Error ? e.message : e); return false; }
}

// ── The conversation ───────────────────────────────────────────────────────────────────────────────────────────────
export async function handleFunnelMessage(m: { digits: string; name: string; body: string; media: Media[]; inboxId: string; st: InboxState; state: FunnelState; operator?: boolean; payload?: string }) {
  const { digits, body, media } = m;
  const local = normalizePhone('+' + digits);
  const fresh = (m.state as { isNew?: boolean }).isNew;
  const afterDone = (m.state as { afterDone?: boolean }).afterDone;
  await lock(digits);
  // Re-read inside the lease: another message may have moved the chat on.
  let st = fresh ? null : ((await db().rpc('mm_wa_funnel_get', { p_secret: secret(), p_phone: digits })).data as FunnelState | null);
  const now = new Date().toISOString();
  const videos = media.filter((x) => x.type.startsWith('video/'));

  if (afterDone && st?.lead_id) { // a late video after the chat finished
    const c: Ctx = { digits, local, st, profile: m.name };
    if (videos.length) {
      let ok = 0;
      for (const v of videos) if (await storeVideo(c, v)) ok++;
      const row = await updateLead(c, {});
      if (ok && row) await notifyLead('video', row);
      await say(digits, ok ? 'קיבלנו את הסרטון והוספנו אותו לבקשה שלך 👍' : 'לא הצלחנו לשמור את הסרטון 😕 אפשר לנסות שוב, או לשלוח קובץ קצר יותר.');
      await save(digits, {});
    } else {
      await save(digits, {});
      await forwardToOperator({ digits, name: m.name, body, media, id: m.inboxId, st: m.st }); // anything else: the normal inbox
    }
    return;
  }

  if (fresh || !st || st.status !== 'active') {
    const test = isQaStarter(body) || !!m.operator;
    st = await save(digits, { reset: true, step: 'from', status: 'active', test, source: body.match(CODE)?.[1]?.toUpperCase() || null,
      data: { ask: 'from', profile: m.name }, last_in: now, reminders: 0, next_reminder_at: null });
    if (!st) return;
    const c: Ctx = { digits, local, st, profile: m.name };
    step(c, 'from');
    const hi = cleanName(m.name).split(' ')[0];
    await say(digits, [
      `היי${hi ? ` ${hi}` : ''}! 👋 כאן MoveMatch.`,
      'כמה שאלות קצרות, ותקבלו כאן הצעות מחיר ממובילים מאומתים באזור שלכם. השירות בחינם וללא התחייבות.',
      '',
      OPENER.from,
      '',
      '_בהמשך השיחה אתם מאשרים ש-MoveMatch תעביר את פרטי ההובלה למובילים ותשלח לכם עדכונים כאן. להפסקה: כתבו "הסר"._',
    ].join('\n'));
    await save(digits, { next_reminder_at: nextReminder(now, 0) });
    return;
  }

  const c: Ctx = { digits, local, st, profile: m.name };
  const data: Data = { ...st.data };
  let reply = '';
  let nextStep: Step = st.step;

  // Starter sent again in the middle of a chat (clicked the ad twice): just ask the current question again.
  if (isStarter(body) && !videos.length) {
    await sayQuestion(digits, 'ממשיכים מאיפה שעצרנו 🙂\n\n', data.ask);
    await save(digits, { last_in: now, next_reminder_at: nextReminder(now, st.reminders) });
    return;
  }

  // Lead first (from the first answer): runs the 30-day rule and gives videos somewhere to go.
  const lead = await ensureLead(c);
  if (lead !== 'ok') {
    await say(digits, lead === 'recent'
      ? 'כבר נפתח מכרז הובלה עם המספר הזה בחודש האחרון, ולכן לא נוכל לפתוח חדש כרגע. יש שאלה? כתבו כאן ונחזור אליכם 🙏'
      : 'כדי לפתוח בקשה צריך מספר נייד ישראלי. אפשר למלא את הפרטים באתר: https://movematch.co.il');
    await save(digits, { status: 'handoff', last_in: now, next_reminder_at: null });
    return;
  }

  // Videos are welcome at any step; they skip the video question later.
  let stored = 0;
  for (const v of videos) if (await storeVideo(c, v)) stored++;
  if (stored) data.videos = (data.videos || 0) + stored;
  if (videos.length && !stored) reply = 'לא הצלחנו לשמור את הסרטון 😕 אפשר לנסות שוב, או לצלם סרטון קצר יותר.\n\n';
  else if (stored && st.step !== 'video') reply = 'קיבלנו את הסרטון 👍\n\n';
  let waitingForVideo = false;
  // Voice notes aren't transcribed (yet): ask to type or tap instead.
  if (!body.trim() && media.some((x) => x.type.startsWith('audio/'))) reply += 'כרגע אפשר לענות רק בהקלדה או בכפתורים 🙂\n\n';

  const text = body.trim();
  const ask = data.ask || st.step;
  let reading: Reading | null = null;
  const readFor = async (asking: string) => (text ? (reading = await readAnswer({ asking, question: questionText(ask), message: text, today: todayText() })) : null);

  if (st.step === 'from' || st.step === 'to') {
    const side = st.step;
    const field = (ask.split('.')[1] as AddrField | undefined) || null;
    const tapped = m.payload ? buttonAnswer(m.payload) : null;
    const quick = !tapped && field && text ? quickAddress(field, text) : null;
    if (tapped || quick) data[side] = { ...(data[side] || {}), ...(tapped || quick) };
    else if (text) {
      const r = await readFor(`the ${side === 'from' ? 'origin (moving from)' : 'destination (moving to)'} address${field ? `, specifically: ${LABEL[field]}` : ''}`);
      const patch: Partial<AddrPatch> = r?.address ? r.address : r ? {} : fallbackAddress(text, field);
      const cur: Partial<Address> = { ...(data[side] || {}) };
      for (const [k, v] of Object.entries(patch)) if (v !== null && v !== undefined && v !== '') (cur as Record<string, unknown>)[k] = v;
      if (cur.elevator_type && cur.elevator == null) cur.elevator = true;
      if (cur.elevator === false) cur.elevator_type = '';
      data[side] = cur;
    }
    const need = missing(data[side]);
    if (need) {
      data.ask = `${side}.${need}`;
    } else {
      nextStep = side === 'from' ? 'to' : 'when';
      data.ask = nextStep;
      await updateLead(c, { [side === 'from' ? 'move_from' : 'move_to']: data[side], ...(side === 'from' ? { city: data.from?.city } : {}), furthest_step: STEP_NO[nextStep] });
      step(c, nextStep);
    }
  } else if (st.step === 'when') {
    let w: Partial<When> | null = null;
    if (ask === 'when.time') { // the date is known; asking for the time of day
      let t = m.payload ? timeAnswer(m.payload) : null;
      if (!t && text) t = quickTime(text);
      if (!t && text) {
        const r = await readFor('the preferred time of day for the move (morning / noon / afternoon, or no preference)');
        if (r?.when && (r.when.time || r.when.time_flexible)) t = { time: r.when.time || '', time_flexible: !r.when.time };
      }
      if (t) w = { ...(data.when || {}), ...t };
    } else if (text) {
      w = quickWhen(text);
      if (!w) {
        const r = await readFor('the moving date (and preferred time of day)');
        w = r?.when ? { date: r.when.date || '', date_flexible: !!r.when.date_flexible, time: r.when.time || '', time_flexible: !!r.when.time_flexible } : r ? null : fallbackWhen(text);
      }
      if (w && !(w.date || w.date_flexible)) w = null;
      // A date without a time of day: ask for the time once (buttons) before moving on.
      if (w && w.date && !w.time && !w.time_flexible) { data.when = w; data.ask = 'when.time'; await updateLead(c, { move_when: w }); w = null; }
    }
    if (w) {
      data.when = w;
      nextStep = data.videos ? 'name' : 'video';
      data.ask = nextStep;
      await updateLead(c, { move_when: w, furthest_step: STEP_NO[nextStep] });
      step(c, nextStep);
    }
  } else if (st.step === 'video') {
    if (stored) {
      nextStep = 'name'; data.ask = 'name';
      reply += 'קיבלנו את הסרטון 👍 אם יש עוד חדרים, אפשר לשלוח עוד סרטונים גם בהמשך.\n\n';
      await updateLead(c, { furthest_step: STEP_NO.name });
      step(c, 'name');
    } else if (text) {
      const plainNo = /^(בלי סרטון|אין לי סרטון|אין סרטון|לא רוצה|לא יכול(ה)?|אין)$/.test(tidy(text));
      const r = plainNo ? null : await readFor('a walk-through video of the apartment (the customer should send a video file)');
      const declined = plainNo || (r ? r.intent === 'decline_video' : /אין|לא יכול|לא רוצה|בלי סרטון|אחר כך|מאוחר/.test(text));
      if (declined) {
        data.video_refusals = (data.video_refusals || 0) + 1;
        if (data.video_refusals >= 2 || /בלי סרטון/.test(text)) {
          nextStep = 'name'; data.ask = 'name';
          reply += 'אין בעיה, נמשיך בלי סרטון. מוביל ייצור איתכם קשר כדי להבין מה עובר.\n\n';
          await updateLead(c, { video_skipped: true, furthest_step: STEP_NO.name });
          step(c, 'name');
        } else {
          reply += 'הסרטון חוסך לכם ביקור של מוביל בבית ונותן מחיר מדויק יותר. אפשר לצלם גם מאוחר יותר ולשלוח כאן.\nאם בכל זאת אין אפשרות, כתבו "בלי סרטון" ונמשיך.';
          await finish(c, data, nextStep, reply, now);
          return;
        }
      } else waitingForVideo = true;
    }
  } else if (st.step === 'name') {
    if (text) {
      const simple = quickName(text);
      const r = simple ? null : await readFor("the customer's name");
      // The name only: drop anything in brackets and extra remarks ("עזרא מנגד (זה ליד לא אמיתי)").
      const name = cleanName(simple || r?.name || text.replace(/\(.*?\)|\[.*?\]/g, ' ').split(/[,.\n-]/)[0]).split(' ').slice(0, 4).join(' ');
      if (name.length >= 2) {
        data.name = name;
        nextStep = 'done';
        const row = await updateLead(c, { name: (st.test ? 'QA ' : '') + name, status: 'complete', furthest_step: STEP_NO.done });
        if (row) {
          step(c, 'done');
          ga(c, 'lead_complete', {});
          const first = name.split(' ')[0];
          const held = row.entry === 'home';
          await say(digits, [
            `תודה ${first}! 🎉 מכרז הובלה מס׳ ${row.tender_no} נפתח.`,
            st.test ? '🧪 זו בדיקה (QA): הבקשה נשמרה כליד בדיקה ולא נשלחה לאף מוביל.'
              : held ? 'אנחנו מעבירים את הפרטים למובילים באזור שלך. כל הצעת מחיר תגיע לכאן, ואפשר לראות את כולן ולהשוות בדף המכרז:'
              : 'המובילים באזור שלך מקבלים עכשיו את הפרטים. כל הצעת מחיר תגיע לכאן, ואפשר לראות את כולן ולהשוות בדף המכרז:',
            `${siteUrl()}/t/${row.client_code}`,
            '',
            'צוות MoveMatch',
          ].join('\n'));
          await save(digits, { step: 'done', status: 'done', data: { ...data, ask: 'done' }, last_in: now, next_reminder_at: null });
          await onLeadComplete(row, { pingMovers: true });
          return;
        }
      }
    }
  }

  // Asked for a person: hand the chat to the operator's inbox.
  if ((reading as Reading | null)?.intent === 'human') {
    await say(digits, 'בטח! נציג של MoveMatch יחזור אליכם כאן בהקדם 🙏');
    await save(digits, { status: 'handoff', data, last_in: now, next_reminder_at: null });
    await forwardToOperator({ digits, name: m.name, body, media, id: m.inboxId, st: m.st, note: '🙋 ביקש/ה נציג באמצע הצ׳אט (משפך F)' });
    return;
  }
  const rd = reading as Reading | null;
  if (rd?.intent === 'question' && rd.reply) reply += rd.reply + '\n\n';
  else if (waitingForVideo) reply += 'מחכים לסרטון 🙂\n\n';
  else if (nextStep === st.step && data.ask === ask && text && !stored) reply += 'לא הבנתי עד הסוף 🙂 ';
  await finish(c, data, nextStep, reply, now);
}

async function finish(c: Ctx, data: Data, nextStep: Step, prefix: string, now: string) {
  await sayQuestion(c.digits, prefix, data.ask);
  // At most 2 reminders per chat in total (they are not reset when the customer answers).
  await save(c.digits, { step: nextStep, data, last_in: now, next_reminder_at: nextReminder(now, c.st.reminders) });
}

// ── Reminders (app/api/cron/wa-funnel) ─────────────────────────────────────────────────────────────────────────────
export async function sendDueReminders() {
  const { data, error } = await db().rpc('mm_wa_funnel_claim_reminders', { p_secret: secret() });
  if (error) { console.error('[wa-funnel] reminders', error.message); return { due: 0, sent: 0 }; }
  const due = (data || []) as FunnelState[];
  let sent = 0;
  for (const f of due) {
    if (!windowLeftMs(f.last_in)) continue; // the 24h window closed: free-form is no longer allowed
    const hi = cleanName(f.data.name || f.data.profile).split(' ')[0];
    const prefix = f.reminders <= 1
      ? `היי${hi ? ` ${hi}` : ''} 👋 נשארו רק עוד כמה שאלות כדי לקבל הצעות מחיר להובלה.\n\n`
      : 'תזכורת אחרונה מ-MoveMatch 🚚 אם עדיין מחפשים מוביל, אפשר להמשיך מכאן:\n\n';
    if (await sayQuestion(f.phone, prefix, f.data.ask)) sent++;
    await save(f.phone, { next_reminder_at: nextReminder(f.last_in, f.reminders) });
  }
  return { due: due.length, sent };
}


/** For local checks of the plain-code answer readers. */
export const __test = { quickAddress, quickWhen, quickTime, quickName };
