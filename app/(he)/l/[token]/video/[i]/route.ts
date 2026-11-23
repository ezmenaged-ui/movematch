import { NextRequest } from 'next/server';
import { getPublicLead } from '@/lib/publicLead';
import { videoResponse } from '@/lib/videoStream';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Public video link for movers: only videos that belong to this share token. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string; i: string }> }) {
  const { token, i } = await ctx.params;
  const lead = await getPublicLead(token);
  const v = lead?.videos[Number(i)];
  if (!v) return new Response('not found', { status: 404 });
  return videoResponse(v.path, v.parts || 1, req.nextUrl.searchParams.get('download') === '1');
}
