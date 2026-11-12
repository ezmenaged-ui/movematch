import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** How many videos the lead has: the desktop polls this while the customer films on their phone. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const k = req.nextUrl.searchParams.get('k') || '';
  if (!UUID.test(id) || !UUID.test(k)) return NextResponse.json({ error: 'bad id' }, { status: 400 });
  const { data } = await db().rpc('mm_lead_videos', { p_id: id, p_token: k });
  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const d = data as { count: number; status: string; ready: boolean };
  return NextResponse.json({ count: d.count, status: d.status, ready: d.ready }, { headers: { 'Cache-Control': 'no-store' } });
}
