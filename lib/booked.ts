import 'server-only';
import { db, LeadRow } from './db';
import { isTestLead } from './qa';
import { gaSend } from './gaServer';
import { funnelOf } from './qualify';

/**
 * booked_move: a mover marked "the client chose me" (bids.booked_at, /movers/leads/…). Sent once per lead to GA4 from the
 * server, as the same GA4 user as the original visit (web: ga_client_id saved on the lead; WhatsApp: the phone hash), with
 * the job price as value. Google Ads gets booked moves from the offline upload (app/api/ads/conversions), which matches
 * on the gclid, so nobody has to report bookings by hand. Test leads are never reported.
 */
export async function reportBooked(leadId: string) {
  const secret = process.env.MM_ADMIN_SECRET;
  const { data, error } = await db().rpc('mm_lead_for_tracking', { p_secret: secret, p_id: leadId });
  if (error || !data) { if (error) console.error('[booked] read (migration 027 applied?)', error.message); return; }
  const l = data as LeadRow & { booked_value: number | null };
  if (isTestLead(l)) return;
  const { data: newly } = await db().rpc('mm_lead_mark', { p_secret: secret, p_id: leadId, p_kind: 'booked' });
  if (newly !== true) return; // already reported (the mover can save the booking again)
  const funnel = funnelOf(l.variant);
  await gaSend({ clientId: l.ga_client_id, sessionId: l.ga_session_id, phone: l.phone }, 'booked_move', {
    lead_id: l.id, funnel, theme: funnel === 'f' ? 'whatsapp' : l.theme || 'photo', variant_id: funnel === 'f' ? 'f-whatsapp' : `${funnel}-${l.theme || 'photo'}`,
    ...(l.utm_source ? { utm_source: l.utm_source } : {}), ...(l.utm_campaign ? { utm_campaign: l.utm_campaign } : {}),
    click_id_type: l.gclid ? 'gclid' : l.gbraid ? 'gbraid' : l.wbraid ? 'wbraid' : 'none',
    ...(l.booked_value ? { value: Number(l.booked_value), currency: 'ILS' } : {}),
  });
}
