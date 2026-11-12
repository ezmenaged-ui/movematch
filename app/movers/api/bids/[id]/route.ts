import { NextRequest, NextResponse, after } from 'next/server';
import { moverDb } from '@/lib/mover';
import { notifyBid, type BidResult } from '@/lib/bidNotify';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Signed-in mover submits / updates their offer. Same rules as the public page (deadline, one offer per mover). */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return NextResponse.json({ error: 'bad id' }, { status: 400 });
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }); }
  const price = Math.round(Number(String(b.price || '').replace(/[^\d.]/g, '')));
  if (!Number.isFinite(price) || price < 100 || price > 200000) return NextResponse.json({ error: 'price' }, { status: 422 });
  const date = typeof b.available_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.available_date) ? b.available_date : '';
  const flexible = b.available_flexible === true;
  const note = String(b.note || '').trim().slice(0, 1000);
  const p = { price, available_date: flexible ? '' : date, available_flexible: flexible, note };

  const { data, error } = await (await moverDb()).rpc('mm_mover_submit_bid', { p_id: id, p });
  if (error?.message?.includes('forbidden')) return NextResponse.json({ error: 'auth' }, { status: 401 });
  if (error?.message?.includes('tender closed') || error?.message?.includes('booked')) return NextResponse.json({ error: 'closed' }, { status: 409 });
  if (error || !data) return NextResponse.json({ error: 'db' }, { status: error?.message?.includes('not found') ? 404 : 500 });
  after(() => notifyBid(data as BidResult, { price, flexible, date, note }));
  return NextResponse.json({ ok: true, updated: !(data as BidResult).is_new });
}
