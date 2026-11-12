import { NextRequest } from 'next/server';
import { videoResponse } from '@/lib/videoStream';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Admin video link (protected by the /admin login in middleware). */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  return videoResponse(sp.get('path') || '', Number(sp.get('parts')) || 1, sp.get('download') === '1');
}
