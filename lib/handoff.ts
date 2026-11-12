'use client';
import type { LeadRef } from './client';

/** The shared first step (funnels B and C) creates the lead, then hands it to the next page. */
export type Funnel = 'a' | 'b' | 'c' | 'd';
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
export const VARIANT: Record<Funnel, 'a' | 'wizard' | 'form' | 'items'> = { a: 'a', b: 'wizard', c: 'form', d: 'items' };
export const NEXT_PATH: Record<Funnel, string> = { a: '', b: '/b/steps', c: '/c/details', d: '/d/steps' };
