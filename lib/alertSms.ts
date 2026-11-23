import 'server-only';
import type { LeadRow } from './db';
import { tenderRef } from './publicLead';
import { whenText } from './validate';
import { EN_TAG, isEnLead } from './langTag';

/** Short SMS versions of the WhatsApp alerts, used when WhatsApp can't deliver (keep them short: Hebrew SMS bills per 70 chars). */
const route = (l: Pick<LeadRow, 'move_from' | 'move_to' | 'city'>) => `${(l.move_from?.city as string) || l.city || '?'} ← ${(l.move_to?.city as string) || '?'}`;
const when = (l: LeadRow) => (l.move_when ? whenText(l.move_when as never) : '');

export const moverAlertSms = (l: LeadRow, m: { token: string }, site: string) =>
  [`MoveMatch: מכרז הובלה חדש ${tenderRef(l)}`, `${route(l)}${when(l) ? ` · ${when(l)}` : ''}`, isEnLead(l) ? EN_TAG : '', `לפרטים ולהגשת הצעה: ${site}/l/${l.share_token}?m=${m.token}`].filter(Boolean).join('\n');

export const operatorAlertSms = (l: LeadRow, site: string) =>
  [`MoveMatch: ליד מלא ${tenderRef(l)}${l.entry === 'home' ? ' (דף הבית, לא נשלח למובילים)' : ''}`, `${l.name} · ${l.phone}${isEnLead(l) ? ' · אנגלית' : ''}`, l.variant === 'a' ? `${l.city || '?'} · להתקשר ללקוח` : route(l), `${site}/admin`].join('\n');
