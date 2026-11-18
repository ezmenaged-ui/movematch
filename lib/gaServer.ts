import 'server-only';
import { createHash } from 'node:crypto';

/**
 * GA4 events sent from the server (Measurement Protocol), for funnel F where there is no browser to run gtag.
 * Needs NEXT_PUBLIC_GA_ID (already set for the site) and GA4_API_SECRET (GA4 → Admin → Data streams → web stream →
 * Measurement Protocol API secrets). Without the secret nothing is sent.
 * client_id is a hash of the phone number, so one chat = one GA4 user and no phone number reaches Google.
 */
export async function gaEvent(phone: string, name: string, params: Record<string, unknown>) {
  const id = process.env.NEXT_PUBLIC_GA_ID, key = process.env.GA4_API_SECRET;
  if (!id || !key) return;
  const h = createHash('sha256').update(`mm-ga:${phone}`).digest();
  const clientId = `${h.readUInt32BE(0)}.${h.readUInt32BE(4)}`;
  try {
    const r = await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(id)}&api_secret=${encodeURIComponent(key)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, events: [{ name, params: { ...params, engagement_time_msec: 1 } }] }),
    });
    if (!r.ok) console.error('[ga]', name, r.status);
  } catch (e) { console.error('[ga]', name, e instanceof Error ? e.message : e); }
}
