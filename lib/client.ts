'use client';
import type { Variant } from './validate';

const UTM_KEY = 'mm_utm';

/** First-touch UTM params, kept for the session so they survive step changes. */
export function getUtm(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const q = new URLSearchParams(window.location.search);
  const fresh: Record<string, string> = {};
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign']) { const v = q.get(k); if (v) fresh[k] = v; }
  try {
    if (Object.keys(fresh).length) { sessionStorage.setItem(UTM_KEY, JSON.stringify(fresh)); return fresh; }
    return JSON.parse(sessionStorage.getItem(UTM_KEY) || '{}');
  } catch { return fresh; }
}

export type LeadRef = { id: string; token: string };

/** Thrown when this phone number already opened a tender in the last 30 days. */
export class PhoneRecentError extends Error {
  constructor(public until: string) { super('phone_recent'); }
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
    body: JSON.stringify({ variant, ...getUtm(), ...fields, website: honeypot }),
  });
  if (!r.ok) await leadFail(r, 'create failed');
  return r.json();
}

export async function updateLead(ref: LeadRef, fields: Record<string, unknown>) {
  const r = await fetch(`/api/leads/${ref.id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: ref.token, ...fields }), keepalive: !('add_video' in fields),
  });
  if (!r.ok) await leadFail(r, 'update failed');
  return r.json();
}

/**
 * Funnel analytics: one `funnel_step` event per step a visitor reaches, with the same parameters in every funnel,
 * so GA4 (Explore → Funnel exploration, broken down by `funnel` or `variant_id`) shows where each funnel loses people.
 * step_name is prefixed with its number ("3_to") so reports sort in funnel order.
 *   A: 0_landing → 1_contact (lead complete)
 *   B: 0_landing → 1_contact → 2_from → 3_to → 4_when → 5_video → 6_done
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
  const w = window as unknown as { dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void; fbq?: (...a: unknown[]) => void };
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({ event, ...data });
  w.gtag?.('event', event, data);
  if (event === 'lead_created') w.fbq?.('track', 'Lead', data);
  if (event === 'lead_complete') w.fbq?.('track', 'CompleteRegistration', data);
}

/** Each clip may be at most 90 seconds (small tolerance for metadata rounding). */
export const MAX_VIDEO_SECONDS = 90;
export const MAX_VIDEO_SECONDS_TOLERANCE = 95;
/** Hard ceiling per file (a 90s 4K clip is ~400-500MB). */
export const MAX_VIDEO_BYTES = 700 * 1024 * 1024;
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
