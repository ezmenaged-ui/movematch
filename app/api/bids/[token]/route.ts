import { NextRequest, NextResponse, after } from 'next/server';
import { db } from '@/lib/db';
import { notifyBid, type BidResult } from '@/lib/bidNotify';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** A mover submits (or updates) their price for a lead from the public mover page. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  if (!UUID.test(token)) return NextResponse.json({ error: 'bad link' }, { status: 400 });
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }); }
  if (b.website) return NextResponse.json({ ok: true }); // honeypot

  // A pre-registered mover arrives with ?m=<token>: their phone and company come from the roster.
  const moverToken = typeof b.mover_token === 'string' && UUID.test(b.mover_token) ? b.mover_token : '';
  const phone = String(b.mover_phone || '').replace(/\D/g, '').replace(/^972/, '0');
  const price = Math.round(Number(String(b.price || '').replace(/[^\d.]/g, '')));
  if (!moverToken && !/^0\d{8,9}$/.test(phone)) return NextResponse.json({ error: 'phone' }, { status: 422 });
  if (!Number.isFinite(price) || price < 100 || price > 200000) return NextResponse.json({ error: 'price' }, { status: 422 });
  const date = typeof b.available_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.available_date) ? b.available_date : '';
  const flexible = b.available_flexible === true;
  const p = { mover_token: moverToken, mover_phone: phone, price, mover_name: String(b.mover_name || '').trim().slice(0, 120), available_date: flexible ? '' : date, available_flexible: flexible, note: String(b.note || '').trim().slice(0, 1000) };

  const { data, error } = await db().rpc('mm_submit_bid', { p_token: token, p });
  if (error?.message?.includes('tender closed')) return NextResponse.json({ error: 'closed' }, { status: 409 });
  if (error || !data) return NextResponse.json({ error: error?.message?.includes('not found') ? 'not found' : 'db' }, { status: error?.message?.includes('not found') ? 404 : 500 });
  const { is_new } = data as { is_new: boolean };
  after(() => notifyBid(data as BidResult, { price, flexible, date, note: p.note }));
  return NextResponse.json({ ok: true, updated: !is_new });
}
