import 'server-only';
import type { LeadRow } from './db';
import { siteUrl } from './notify';
import { onBid } from './automations';
import { tenderRef } from './publicLead';

export type BidResult = { lead: LeadRow & { client_token: string }; is_new: boolean; bid_count: number; bid: { mover_phone: string; mover_name: string | null } };

/** Operator + client notifications after a mover submits or updates an offer (public page or mover panel). */
export async function notifyBid(data: BidResult, o: { price: number; flexible: boolean; date: string; note: string }) {
  const { lead, is_new, bid_count, bid } = data;
  const moverPhone = bid.mover_phone, moverName = bid.mover_name || '';
  const ref = tenderRef(lead);
  const from = (lead.move_from?.city as string) || lead.city || '?';
  const to = (lead.move_to?.city as string) || '?';
  const text = [
    `💰 ${is_new ? 'הצעת מחיר חדשה' : 'הצעת מחיר עודכנה'} — מכרז ${ref} (${from} ← ${to})`,
    `מחיר: ₪${o.price.toLocaleString('he-IL')}`,
    `מוביל: ${moverName || 'לא צוין שם'} · ${moverPhone}`,
    `וואטסאפ למוביל: https://wa.me/972${moverPhone.slice(1)}`,
    o.flexible ? 'תאריך: גמיש' : o.date ? `תאריך פנוי: ${new Date(o.date + 'T12:00:00').toLocaleDateString('he-IL')}` : '',
    o.note ? `הערה: ${o.note}` : '',
    `סה״כ הצעות למכרז הזה: ${bid_count}`,
    `לקוח: ${lead.name} · ${lead.phone}`,
    siteUrl() ? `כל הלידים וההצעות: ${siteUrl()}/admin` : '',
  ].filter(Boolean).join('\n');
  await onBid({ lead, isNew: is_new, bidCount: bid_count, price: o.price, moverName, moverPhone, emailText: text });
}
