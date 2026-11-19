import 'server-only';
import { createHash } from 'node:crypto';

/**
 * GA4 events sent from the server (Measurement Protocol): funnel F (no browser), and booked_move (a mover marks the job
 * booked, days after the visit). Needs NEXT_PUBLIC_GA_ID and GA4_API_SECRET (GA4 → Admin → Data streams → web stream →
 * Measurement Protocol API secrets). Without the secret nothing is sent.
 *
 * Who the event belongs to:
 *  - a web lead: the visitor's own GA4 client_id / session_id saved on the lead (migration 027), so the event joins the
 *    visit that came from the ad;
 *  - a WhatsApp lead (or a web lead from before migration 027): a hash of the phone number, so one chat = one GA4 user
 *    and no phone number reaches Google.
 * GA_DEBUG_LOG=1 prints every event (and, for QA test leads, the event that would have been sent): for local tests.
 */
export type GaWho = { phone?: string | null; clientId?: string | null; sessionId?: string | null };

export const phoneClientId = (phone: string) => {
  const h = createHash('sha256').update(`mm-ga:${phone}`).digest();
  return `${h.readUInt32BE(0)}.${h.readUInt32BE(4)}`;
};

export async function gaSend(who: GaWho, name: string, params: Record<string, unknown>) {
  const clientId = who.clientId || (who.phone ? phoneClientId(who.phone) : null);
  if (!clientId) return;
  const p: Record<string, unknown> = { ...params, engagement_time_msec: 1 };
  if (who.sessionId) p.session_id = who.sessionId;
  const body = { client_id: clientId, events: [{ name, params: p }] };
  if (process.env.GA_DEBUG_LOG === '1') console.info('[ga:mp]', JSON.stringify(body));
  const id = process.env.NEXT_PUBLIC_GA_ID, key = process.env.GA4_API_SECRET;
  if (!id || !key) return;
  try {
    const r = await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(id)}&api_secret=${encodeURIComponent(key)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    if (!r.ok) console.error('[ga]', name, r.status);
  } catch (e) { console.error('[ga]', name, e instanceof Error ? e.message : e); }
}

/** Funnel F (and older callers): the GA4 user is the phone-number hash. */
export const gaEvent = (phone: string, name: string, params: Record<string, unknown>) => gaSend({ phone }, name, params);
