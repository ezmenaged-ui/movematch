import 'server-only';
import type { LeadRow } from './db';
import { siteUrl } from './notify';

/**
 * "Your tender is open" SMS to the client. Hebrew SMS segments are 67 chars, so the Hebrew one stays around 3 segments.
 * Clients from the English site (lead.lang = 'en') get it in English, with the English tender page.
 * (WhatsApp templates are Hebrew-only until English ones are approved by Meta; their /t/<code> link forwards to /en/t/<code>.)
 */
export function tenderOpenedSms(l: LeadRow) {
  const first = l.name.trim().split(/\s+/)[0];
  if (l.lang === 'en') {
    return [
      `Hi ${first}, your MoveMatch moving tender no. ${l.tender_no} is open.`,
      'See the price quotes from movers as they arrive, and choose your mover, on your tender page:',
      `${siteUrl()}/en/t/${l.client_code}`,
      'The MoveMatch team',
    ].join('\n');
  }
  return [
    `היי ${first}, מכרז הובלה מס׳ ${l.tender_no} נפתח בהצלחה.`,
    'בדף המכרז שלך אפשר לראות את הצעות המחיר מהמובילים בזמן אמת ולבחור את המוביל שלך:',
    `${siteUrl()}/t/${l.client_code}`,
    'צוות MoveMatch',
  ].join('\n');
}
