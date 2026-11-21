'use client';
import type { Variant } from './validate';

const UTM_KEY = 'mm_utm';
const ATTR_KEY = 'mm_attr';
const ATTR_DAYS = 90; // Google Ads' default click-through conversion window
const UTM_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;
const CLICK_FIELDS = ['gclid', 'gbraid', 'wbraid'] as const;

export type Attribution = Partial<Record<(typeof UTM_FIELDS)[number] | (typeof CLICK_FIELDS)[number] | 'landing_path', string>>;

/**
 * Ad attribution for this visitor: UTM fields + Google Ads click ids (gclid / gbraid / wbraid) + the landing path.
 * A visit whose URL carries any of them replaces what was stored (the latest ad click wins, like Google Ads' last click);
 * otherwise the stored values are used for 90 days, so a visitor who comes back later (or opens the follow-up page
 * in a new tab) still carries the click. The short addresses (/d → /d/photo) keep the query string, see next.config.mjs.
 */
export function getAttribution(): Attribution {
  if (typeof window === 'undefined') return {};
  const q = new URLSearchParams(window.location.search);
  const fresh: Attribution = {};
  for (const k of [...UTM_FIELDS, ...CLICK_FIELDS]) { const v = q.get(k); if (v) fresh[k] = v.slice(0, 200); }
  try {
    if (Object.keys(fresh).length) {
      fresh.landing_path = window.location.pathname.slice(0, 200);
      localStorage.setItem(ATTR_KEY, JSON.stringify({ ...fresh, t: Date.now() }));
      sessionStorage.setItem(UTM_KEY, JSON.stringify(fresh));
      return fresh;
    }
    const s = JSON.parse(sessionStorage.getItem(UTM_KEY) || 'null') || JSON.parse(localStorage.getItem(ATTR_KEY) || 'null');
    if (s && (!s.t || Date.now() - s.t < ATTR_DAYS * 864e5)) { const { t: _t, ...a } = s; return a as Attribution; }
  } catch { /* private mode */ }
  return { landing_path: window.location.pathname.slice(0, 200) };
}

/** UTM fields only (older callers). */
export function getUtm(): Record<string, string> {
  const a = getAttribution();
  const out: Record<string, string> = {};
  for (const k of UTM_FIELDS) if (a[k]) out[k] = a[k]!;
  return out;
}

/** Parameters added to every lead event in GA4, so leads can be split by ad, campaign and click type. */
export function attributionParams(): Record<string, string> {
  const a = getAttribution();
  const out: Record<string, string> = {};
  for (const k of UTM_FIELDS) if (a[k]) out[k] = a[k]!;
  out.click_id_type = a.gclid ? 'gclid' : a.gbraid ? 'gbraid' : a.wbraid ? 'wbraid' : 'none';
  return out;
}

/** The visitor's GA4 client_id and session_id (asked from gtag, at most 800 ms), saved on the lead for server-side events. */
async function gaIds(): Promise<{ ga_client_id?: string; ga_session_id?: string }> {
  const w = window as unknown as { gtag?: (...a: unknown[]) => void };
  const id = process.env.NEXT_PUBLIC_GA_ID;
  if (!w.gtag || !id) return {};
  const get = (field: string) => new Promise<string | undefined>((res) => {
    const t = setTimeout(() => res(undefined), 800);
    try { w.gtag!('get', id, field, (v: unknown) => { clearTimeout(t); res(v == null ? undefined : String(v)); }); } catch { clearTimeout(t); res(undefined); }
  });
  const [c, s] = await Promise.all([get('client_id'), get('session_id')]);
  return { ...(c ? { ga_client_id: c } : {}), ...(s ? { ga_session_id: s } : {}) };
}

/**
 * Where this visit's lead comes in: 'home' (homepage while it is the test area), 'qa' (/qa test area) or null (live funnel).
 * Set by the landing page and kept for the session, so the follow-up pages (/b/steps …) keep it.
 */
export type Entry = 'home' | 'qa' | null;
const ENTRY_KEY = 'mm_entry';
export function setEntry(e: Entry) {
  try { if (e) sessionStorage.setItem(ENTRY_KEY, e); else sessionStorage.removeItem(ENTRY_KEY); } catch { /* private mode */ }
}
export function getEntry(): Entry {
  if (typeof window === 'undefined') return null;
  if (window.location.pathname === '/qa' || window.location.pathname.startsWith('/qa/')) return 'qa';
  try { const e = sessionStorage.getItem(ENTRY_KEY); return e === 'home' || e === 'qa' ? e : null; } catch { return null; }
}

export type LeadRef = { id: string; token: string };

/** Thrown when this phone number already opened a tender in the last 30 days. */
export class PhoneRecentError extends Error {
  constructor(public until: string) { super('phone_recent'); }
}
/** The lead behind a saved handoff no longer exists (e.g. a test lead that was deleted while the browser still remembered it). */
export class LeadGoneError extends Error {
  constructor() { super('lead_gone'); }
}

async function leadFail(r: Response, msg: string): Promise<never> {
  if (r.status === 409) {
    const j = await r.json().catch(() => ({}));
    if (j.error === 'phone_recent') throw new PhoneRecentError(String(j.until || ''));
  }
  throw new Error(msg);
}

export async function createLead(variant: Variant, fields: Record<string, unknown>, honeypot = ''): Promise<LeadRef> {
  const r = await fetch('/api/leads', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ variant, ...getAttribution(), ...(await gaIds()), ...fields, entry: getEntry(), website: honeypot }),
  });
  if (!r.ok) await leadFail(r, 'create failed');
  return r.json();
}

export async function updateLead(ref: LeadRef, fields: Record<string, unknown>) {
  const r = await fetch(`/api/leads/${ref.id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: ref.token, ...fields }), keepalive: !('add_video' in fields),
  });
  if (r.status === 404) throw new LeadGoneError();
  if (!r.ok) await leadFail(r, 'update failed');
  return r.json();
}

/**
 * Funnel analytics: one `funnel_step` event per step a visitor reaches, with the same parameters in every funnel,
 * so GA4 (Explore → Funnel exploration, broken down by `funnel` or `variant_id`) shows where each funnel loses people.
 * step_name is prefixed with its number ("3_to") so reports sort in funnel order.
 *   A: 0_landing → 1_contact (lead complete)
 *   B: 0_landing → 1_contact → 2_from → 3_to → 4_when → 5_items → 6_done (until 13 Nov 2026 step 5 was 5_video)
 *   C: 0_landing → 1_contact → 2_details → 3_done
 *   D: 0_landing → 1_contact → 2_from → 3_to → 4_when → 5_items → 6_video → 7_done
 * Conversions for Google Ads: `generate_lead` (name + phone saved, every funnel) and `lead_complete` (full details).
 */
export function funnelParams(funnel: string, theme?: string | null) {
  const t = theme || 'photo';
  return { funnel, theme: t, variant_id: `${funnel}-${t}` };
}
export function trackStep(funnel: string, theme: string | null | undefined, n: number, name: string, extra: Record<string, unknown> = {}) {
  track('funnel_step', { ...funnelParams(funnel, theme), step_number: n, step_name: `${n}_${name}`, ...extra });
}

/** Analytics events: pushed to the GTM dataLayer, and sent to GA4 / Meta Pixel when loaded directly. */
export function track(event: string, data: Record<string, unknown> = {}) {
  if (getEntry() === 'qa') return; // /qa test area: keep GA4 reports and Google Ads conversions clean
  const w = window as unknown as { dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void; fbq?: (...a: unknown[]) => void };
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({ event, ...data });
  w.gtag?.('event', event, data);
  if (event === 'lead_created') w.fbq?.('track', 'Lead', data);
  if (event === 'lead_complete') w.fbq?.('track', 'CompleteRegistration', data);
  clarityTags(event, data);
}

/**
 * Microsoft Clarity (components/Clarity.tsx): tag the recording so it can be filtered by funnel and furthest step,
 * and mark leads. Calls are queued until the lazily loaded script arrives. No name or phone is ever sent.
 */
function clarityTags(event: string, data: Record<string, unknown>) {
  if (!process.env.NEXT_PUBLIC_CLARITY_ID) return;
  type Q = ((...a: unknown[]) => void) & { q?: unknown[] };
  const w = window as unknown as { clarity?: Q };
  if (!w.clarity) { const f: Q = (...a: unknown[]) => { (f.q = f.q || []).push(a); }; w.clarity = f; }
  const c = w.clarity;
  if (event === 'funnel_step') {
    if (data.variant_id) c('set', 'funnel', String(data.variant_id));
    if (data.step_name) c('set', 'step', String(data.step_name));
  }
  if (data.lead_id) c('set', 'lead_id', String(data.lead_id));
  if (event === 'generate_lead' || event === 'lead_complete' || event === 'qualify_lead') { c('set', 'lead', event); c('event', event); }
}

/**
 * Lead events that must count once per lead (lead_complete, qualify_lead): fired only the first time for this lead_id
 * in this browser, so a reload, the Back button or a second submit doesn't count the same lead twice.
 * GA4 / Google Ads dedupe on top of this: every event carries lead_id, and the Ads conversion is set to count "One".
 */
export function trackOnce(event: string, leadId: string, data: Record<string, unknown> = {}) {
  const key = `mm_fired:${event}:${leadId}`;
  try { if (localStorage.getItem(key)) return false; localStorage.setItem(key, '1'); } catch { /* private mode: still send */ }
  track(event, { lead_id: leadId, ...attributionParams(), ...data });
  return true;
}

/** Each clip may be at most 4 minutes (small tolerance for metadata rounding). */
export const MAX_VIDEO_SECONDS = 240;
export const MAX_VIDEO_SECONDS_TOLERANCE = 245;
/** Hard ceiling per file (a 4-minute 4K clip can reach ~1.5GB). Uploads go in 45MB parts; lib/sanitize.ts allows up to 50 parts. */
export const MAX_VIDEO_BYTES = 2000 * 1024 * 1024;
/** Supabase free tier caps each stored object at 50MB, so large clips go up in parts. */
const CHUNK = 45 * 1024 * 1024;

function putObject(path: string, body: Blob, type: string, onBytes: (loaded: number) => void): Promise<void> {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/movematch-videos/${path}`;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open('POST', url);
    x.setRequestHeader('apikey', key);
    if (key.startsWith('eyJ')) x.setRequestHeader('Authorization', `Bearer ${key}`);
    x.setRequestHeader('Content-Type', type);
    x.setRequestHeader('x-upsert', 'false');
    x.upload.onprogress = (e) => onBytes(e.loaded);
    // A retry after a lost response finds the part already stored: treat that as success.
    x.onload = () => (x.status >= 200 && x.status < 300 || /Duplicate|already exists/i.test(x.responseText) ? resolve() : reject(new Error(`upload ${x.status} ${x.responseText}`)));
    x.onerror = () => reject(new Error('network'));
    x.send(body);
  });
}

/** Upload straight to Supabase Storage with progress. Files over 45MB are split into
 *  `<path>.p0`, `<path>.p1`, ... and stitched back together by /admin/video. */
export async function uploadVideo(leadId: string, file: File, onProgress: (pct: number) => void): Promise<{ path: string; parts: number }> {
  const ext = (file.name.split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'mp4';
  const path = `${leadId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const type = file.type && file.type.startsWith('video/') ? file.type : 'video/mp4';
  const parts = Math.max(1, Math.ceil(file.size / CHUNK));
  let done = 0;
  for (let i = 0; i < parts; i++) {
    const blob = file.slice(i * CHUNK, Math.min(file.size, (i + 1) * CHUNK), type);
    const name = parts === 1 ? path : `${path}.p${i}`;
    let attempt = 0;
    for (;;) {
      try {
        await putObject(name, blob, type, (l) => onProgress(Math.round(((done + l) / file.size) * 100)));
        break;
      } catch (e) { if (++attempt >= 3) throw e; await new Promise((r) => setTimeout(r, 1500 * attempt)); }
    }
    done += blob.size;
  }
  onProgress(100);
  return { path, parts };
}

export function videoDuration(file: File): Promise<number | null> {
  return new Promise((res) => {
    try {
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.onloadedmetadata = () => { URL.revokeObjectURL(v.src); res(Number.isFinite(v.duration) ? Math.round(v.duration) : null); };
      v.onerror = () => res(null);
      v.src = URL.createObjectURL(file);
      setTimeout(() => res(null), 4000);
    } catch { res(null); }
  });
}

export const fmtDuration = (s: number | null | undefined) =>
  s == null ? '' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} דק׳`;
