import 'server-only';
import { db, LeadRow } from './db';
import { notifyLead, sendAll, siteUrl } from './notify';
import { tenderRef } from './publicLead';
import { elevatorText, whenText } from './validate';
import { hasTemplate, sendWhatsApp, trySendSms, trySendWhatsApp, waEnabled, type TemplateKey } from './whatsapp';
import { moverAlertSms, operatorAlertSms } from './alertSms';
import { isTestLead } from './qa';

type Addr = Record<string, unknown> | null | undefined;
const secret = () => process.env.MM_ADMIN_SECRET;
const operator = () => process.env.OPERATOR_WHATSAPP || '';
const nis = (n: number) => n.toLocaleString('he-IL');
const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;
const routeOf = (l: Pick<LeadRow, 'move_from' | 'move_to' | 'city'>) => `${(l.move_from?.city as string) || l.city || '?'} ← ${(l.move_to?.city as string) || '?'}`;

function floorText(a: Addr) {
  if (!a) return '';
  const f = a.floor ? `קומה ${a.floor}` : '';
  const e = a.elevator === false ? 'בלי מעלית' : elevatorText(a).replace('יש מעלית', 'עם מעלית');
  return [f, e].filter(Boolean).join(' ');
}

/** Short mover-safe description: floors, elevator, video (no name / phone / exact address). */
function moveDetails(l: LeadRow) {
  const from = floorText(l.move_from), to = floorText(l.move_to);
  const floors = from || to ? `${from || '?'} ← ${to || '?'}` : '';
  const video = l.videos?.length ? `סרטון מצורף (${l.videos.length})` : 'בלי סרטון';
  const n = (l.items?.list || []).reduce((s, i) => s + i.qty, 0);
  return [floors, n ? `רשימת ${n} פריטים` : '', video].filter(Boolean).join(', ');
}

/**
 * WhatsApp with an SMS backup: if Twilio refuses the WhatsApp now, SMS right away; if WhatsApp later reports it
 * couldn't deliver (e.g. sender disabled by Meta), /api/twilio/status sends the SMS then. Returns true if either went out.
 */
export async function alertWithSmsBackup(label: string, to: string, key: TemplateKey, vars: unknown[], callback: Record<string, string>, sms: string, opts: { test?: boolean } = {}) {
  if (!to) return false;
  if (waEnabled() && !opts.test) { // test leads: SMS only, never WhatsApp
    try {
      await sendWhatsApp(to, key, vars, { statusCallback: `${siteUrl()}/api/twilio/status?${new URLSearchParams(callback)}` });
      return true;
    } catch (e) { console.error(`[whatsapp:${label}] → SMS`, e instanceof Error ? e.message : e); }
  }
  return trySendSms(`${label}-sms`, to, sms);
}

/**
 * Lead finished the full form/wizard:
 *  1. WhatsApp every active mover (once per lead) with the mover page link.
 *  2. WhatsApp the operator.
 *  3. Email the operator (existing behaviour).
 * Funnel A (callback only) has no move details, so movers are not pinged for it.
 */
export async function onLeadComplete(l: LeadRow, opts: { pingMovers: boolean }) {
  const site = siteUrl();
  const when = l.move_when ? whenText(l.move_when as never) : 'לא צוין';
  let moversSent = 0;

  if (opts.pingMovers) {
    const { data, error } = await db().rpc('mm_claim_mover_ping', { p_secret: secret(), p_id: l.id });
    if (error) console.error('[automations] claim movers', error);
    const movers = (data || []) as { id: string; name: string; company_name: string; phone: string; token: string }[];
    // Each mover gets a personal link (?m=token) so the offer form already knows their company and logo.
    if (isTestLead(l)) console.warn(`[qa] test lead ${tenderRef(l)}: mover alerts suppressed for ${movers.length} movers`);
    const results = isTestLead(l) ? [] : await Promise.all(movers.map((m) => {
      const hi = firstName(m.name) || m.company_name || 'שלום';
      const cb = { kind: 'mover_ping', lead: l.id, mover: m.id };
      const sms = moverAlertSms(l, m, site);
      // v2 (Utility template, link fixed in the template text) once approved; until then the original template.
      return hasTemplate('mover_new_lead_v2')
        ? alertWithSmsBackup('mover', m.phone, 'mover_new_lead_v2', [hi, `${tenderRef(l)} · ${routeOf(l)}`, when, moveDetails(l), `${l.share_token}?m=${m.token}`], cb, sms)
        : alertWithSmsBackup('mover', m.phone, 'mover_new_lead', [hi, `${tenderRef(l)} · ${routeOf(l)}`, when, moveDetails(l), `${site}/l/${l.share_token}?m=${m.token}`], cb, sms);
    }));
    moversSent = results.filter(Boolean).length;
  }

  await Promise.all([
    alertWithSmsBackup('op-lead', operator(), 'op_lead', [
      `${l.name} · מכרז ${tenderRef(l)}`, l.phone, routeOf(l), when, String(l.videos?.length || 0) + (l.video_skipped ? ' (דילג, להתקשר)' : ''),
      opts.pingMovers ? String(moversSent) : '0 (משפך A, להתקשר ללקוח)', `${site}/admin`,
    ], { kind: 'op_lead', lead: l.id }, operatorAlertSms(l, site), { test: isTestLead(l) }),
    notifyLead('complete', l),
  ]);
}

type ClientOffers = { offers: { price: number }[] };

/**
 * A mover submitted or updated an offer:
 *  - New offer → WhatsApp the client (first offer: "first offer is in, more will follow"; later: "another offer").
 *  - Always → WhatsApp + email the operator.
 */
export async function onBid(args: {
  lead: LeadRow & { client_token: string }; isNew: boolean; bidCount: number;
  price: number; moverName: string; moverPhone: string; emailText: string;
}) {
  const { lead, isNew, price } = args;
  const site = siteUrl();
  const route = routeOf(lead);
  let clientStatus = isNew ? 'לא נשלח' : 'לא נשלח (עדכון של הצעה קיימת)';

  const { data: optedOut } = await db().rpc('mm_wa_opted_out', { p_secret: secret(), p_phone: lead.phone });
  if (isNew && optedOut) clientStatus = 'לא נשלח (הלקוח ביקש הסרה)';
  else if (isNew && isTestLead(lead)) clientStatus = 'לא נשלח (ליד בדיקה QA)';
  else if (isNew && waEnabled()) {
    const { data } = await db().rpc('mm_client_offers', { p_token: lead.client_token });
    const offers = ((data as ClientOffers | null)?.offers || []);
    const link = `${site}/t/${lead.client_code}`;
    const name = firstName(lead.name);
    let ok = false;
    if (offers.length <= 1) {
      ok = hasTemplate('client_first_offer_v2')
        ? await trySendWhatsApp('client-first', lead.phone, 'client_first_offer_v2', [name, route, nis(price), lead.client_code])
        : await trySendWhatsApp('client-first', lead.phone, 'client_first_offer', [name, route, nis(price), link]);
      clientStatus = ok ? 'נשלח (הצעה ראשונה)' : 'נכשל, לשלוח ידנית';
    } else {
      const best = Math.min(...offers.map((o) => o.price));
      ok = hasTemplate('client_new_offer_v2')
        ? await trySendWhatsApp('client-new', lead.phone, 'client_new_offer_v2', [name, nis(price), String(offers.length), lead.client_code])
        : await trySendWhatsApp('client-new', lead.phone, 'client_new_offer', [name, nis(price), String(offers.length), nis(best), link]);
      clientStatus = ok ? `נשלח (הצעה מס׳ ${offers.length})` : 'נכשל, לשלוח ידנית';
    }
  }

  // Operator gets offers by email only (WhatsApp per offer was switched off on request).
  await Promise.all([
    sendAll(args.emailText.split('\n')[0] + ` · ₪${price}`, args.emailText + `\nעדכון ללקוח בוואטסאפ: ${clientStatus}`, { event: 'bid', lead_id: lead.id, price, mover_phone: args.moverPhone }),
  ]);
}
