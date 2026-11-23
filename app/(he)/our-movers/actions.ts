'use server';
import { headers } from 'next/headers';
import { db } from '@/lib/db';

export type RevealResult = { ok: true; phone: string } | { ok: false; error: 'name' | 'phone' | 'limit' | 'fail' };

/**
 * A client asks for a mover's number. We log their name + phone against the mover (attribution for direct deals)
 * and return the number. Nothing is sent to anyone here: no SMS, no WhatsApp, no email.
 */
export async function revealPhone(slug: string, input: { name: string; phone: string; utm?: Record<string, string> }): Promise<RevealResult> {
  const name = String(input?.name || '').trim().slice(0, 80);
  const phone = String(input?.phone || '').replace(/\D/g, '').replace(/^972/, '0');
  if (name.length < 2) return { ok: false, error: 'name' };
  if (!/^05\d{8}$/.test(phone)) return { ok: false, error: 'phone' };
  const utm = input?.utm || {};
  const ua = (await headers()).get('user-agent') || '';
  const { data, error } = await db().rpc('mm_reveal_mover_phone', {
    p_slug: String(slug).slice(0, 40),
    p: { name, phone, utm_source: utm.utm_source || '', utm_medium: utm.utm_medium || '', utm_campaign: utm.utm_campaign || '', user_agent: ua.slice(0, 300) },
  });
  if (error) {
    if (/too many|busy/.test(error.message)) return { ok: false, error: 'limit' };
    if (/invalid phone/.test(error.message)) return { ok: false, error: 'phone' };
    console.error('[reveal phone]', error);
    return { ok: false, error: 'fail' };
  }
  const p = String((data as { phone?: string })?.phone || '');
  return p ? { ok: true, phone: p } : { ok: false, error: 'fail' };
}
