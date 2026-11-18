import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { sendDueReminders } from '@/lib/waFunnel';

export const maxDuration = 60;

/**
 * Called every 5 minutes by the database scheduler (pg_cron → pg_net, migration 026).
 * Sends the WhatsApp funnel reminders that are due (20:30, then 10:00 Israel time; at most 2 per chat; only inside the 24h window).
 */
function authorized(req: NextRequest) {
  const key = process.env.MM_ADMIN_SECRET || '';
  const got = req.headers.get('x-mm-cron') || '';
  return !!key && got.length === key.length && timingSafeEqual(Buffer.from(got), Buffer.from(key));
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return new NextResponse('forbidden', { status: 403 });
  return NextResponse.json(await sendDueReminders());
}
