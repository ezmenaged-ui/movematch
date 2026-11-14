'use client';
import { createLead, LeadGoneError, LeadRef, updateLead } from './client';

/** The shared first step (funnels B and C) creates the lead, then hands it to the next page. */
export type Funnel = 'a' | 'b' | 'c' | 'd' | 'e';
export type FlowTheme = 'photo' | 'art';
export type Handoff = { funnel: Funnel; ref: LeadRef; name: string; phone: string; city: string; theme?: FlowTheme; t: number };
const KEY = 'mm_handoff';

export function saveHandoff(h: Omit<Handoff, 't'>) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...h, t: Date.now() })); } catch { /* ignore */ }
}

export function loadHandoff(funnel: Funnel): Handoff | null {
  try {
    const h: Handoff | null = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (h && h.funnel === funnel && h.ref?.id && Date.now() - h.t < 3 * 864e5) return h;
  } catch { /* ignore */ }
  return null;
}

/** DB variant names for each funnel. */
export const VARIANT: Record<Funnel, 'a' | 'wizard' | 'form' | 'items' | 'choice'> = { a: 'a', b: 'wizard', c: 'form', d: 'items', e: 'choice' };
export const NEXT_PATH: Record<Funnel, string> = { a: '', b: '/b/steps', c: '/c/details', d: '/d/steps', e: '/e/steps' };

export function clearHandoff() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

/**
 * Check that the handoff's lead still exists before the follow-up page uses it. If it was deleted, open a fresh lead
 * with the same name and phone (no new generate_lead event) so every later save works. Network errors keep the handoff.
 * Returns null only when a new lead can't be opened (e.g. the 30-day phone rule): the caller sends the visitor to the landing page.
 */
export async function liveHandoff(h: Handoff): Promise<Handoff | null> {
  try { await updateLead(h.ref, {}); return h; } catch (e) {
    if (!(e instanceof LeadGoneError)) return h;
  }
  try {
    const ref = await createLead(VARIANT[h.funnel], { name: h.name, phone: h.phone, city: h.city, theme: h.theme, status: 'partial', furthest_step: 1 });
    const next = { ...h, ref };
    saveHandoff(next);
    return next;
  } catch { clearHandoff(); return null; }
}
