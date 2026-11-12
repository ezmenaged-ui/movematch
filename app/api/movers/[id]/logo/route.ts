import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** A mover's logo (stored as a small data URI on the movers row). Public: logos appear on client offer pages. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return new NextResponse('not found', { status: 404 });
  const { data } = await db().rpc('mm_mover_logo', { p_id: id });
  const m = typeof data === 'string' ? data.match(/^data:(image\/(?:png|jpeg|webp|gif));base64,(.+)$/) : null;
  if (!m) return new NextResponse('not found', { status: 404 });
  return new NextResponse(Buffer.from(m[2], 'base64'), {
    headers: { 'Content-Type': m[1], 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400', 'X-Content-Type-Options': 'nosniff' },
  });
}
