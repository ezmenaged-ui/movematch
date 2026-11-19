import 'server-only';
import { db, LeadRow } from './db';
import { isTestLead } from './qa';
import { isValidName } from './validate';

/**
 * qualified_lead: one definition for funnels D, E and F (and any other funnel). A lead qualifies when ALL of these hold:
 *   1. the backend accepted it as complete (status = 'complete'),
 *   2. it is a real lead: not a QA test lead (name "QA…", utm_source=qa, /qa test area),
 *   3. contact: a real name (not the WhatsApp placeholder) and an Israeli mobile number (05XXXXXXXX),
 *   4. origin: city + street address,
 *   5. destination: city + street address,
 *   6. moving date: a date, or "flexible".
 * Inventory (video / item list) is NOT required, because D's item list and F's video can be skipped; it is reported as
 * the has_inventory parameter so it can be added as a stricter rule later without changing the event.
 * MM_QUALIFY_TEST_LEADS=1 lets QA test leads qualify: for local end-to-end tests only, never set it in Vercel.
 */
export type Qualification = { qualified: boolean; missing: string[]; has_inventory: boolean };

const filled = (v: unknown) => typeof v === 'string' && v.trim().length > 0;

export function qualify(l: LeadRow): Qualification {
  const missing: string[] = [];
  const from = (l.move_from || {}) as Record<string, unknown>, to = (l.move_to || {}) as Record<string, unknown>;
  const when = (l.move_when || {}) as Record<string, unknown>;
  if (l.status !== 'complete') missing.push('complete');
  if (isTestLead(l) && process.env.MM_QUALIFY_TEST_LEADS !== '1') missing.push('real_lead');
  if (!isValidName(l.name || '') || /^(QA\s+)?(QA\s+וואטסאפ\s+)?לקוח וואטסאפ$/.test((l.name || '').trim())) missing.push('name');
  if (!/^05\d{8}$/.test(l.phone || '')) missing.push('phone');
  if (!filled(from.city) || !filled(from.address)) missing.push('origin');
  if (!filled(to.city) || !filled(to.address)) missing.push('destination');
  if (!filled(when.date) && when.date_flexible !== true) missing.push('move_date');
  const items = (l.items as { list?: unknown[] } | null)?.list || [];
  return { qualified: missing.length === 0, missing, has_inventory: (l.videos?.length || 0) > 0 || items.length > 0 };
}

/**
 * Qualify the lead and, the first time it qualifies, record qualified_at (migration 027). Returns newly = true only for
 * that first call, so qualified_lead is sent once per lead however many times the lead is saved.
 * Before migration 027 is applied the mark fails and nothing is reported as new (no event rather than duplicates).
 */
export async function markQualified(l: LeadRow): Promise<Qualification & { newly: boolean }> {
  const q = qualify(l);
  if (!q.qualified) return { ...q, newly: false };
  const { data, error } = await db().rpc('mm_lead_mark', { p_secret: process.env.MM_ADMIN_SECRET, p_id: l.id, p_kind: 'qualified' });
  if (error) { console.error('[qualify] mark (migration 027 applied?)', error.message); return { ...q, newly: false }; }
  return { ...q, newly: data === true };
}

/** GA4 "funnel" value for a lead, from the stored variant (D = items, E = choice, F = chat). */
export const funnelOf = (variant: string) =>
  ({ a: 'a', wizard: 'b', form: 'c', items: 'd', choice: 'e', chat: 'f' } as Record<string, string>)[variant] || variant;
