import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { adminDb, db } from '@/lib/db';

/**
 * Data retention, called daily by the database scheduler (pg_cron → pg_net, see migration 015).
 * Deletes client videos 6 months after the move date, tenders 24 months after they opened, and orphan uploads
 * after 7 days, as promised in the privacy policy (/privacy, section 6).
 */
export const maxDuration = 60;

function authorized(req: NextRequest) {
  const key = process.env.MM_ADMIN_SECRET || '';
  const got = req.headers.get('x-mm-cron') || '';
  return !!key && got.length === key.length && timingSafeEqual(Buffer.from(got), Buffer.from(key));
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return new NextResponse('forbidden', { status: 403 });
  const secret = process.env.MM_ADMIN_SECRET;

  const { data, error } = await db().rpc('mm_retention_due', { p_secret: secret });
  if (error) { console.error('[retention] due', error); return NextResponse.json({ error: 'db' }, { status: 500 }); }
  const due = (data || []) as { name: string; lead_id: string | null }[];

  const removed: string[] = [];
  for (let i = 0; i < due.length; i += 100) {
    const names = due.slice(i, i + 100).map((d) => d.name);
    const { data: gone, error: e } = await adminDb().storage.from('movematch-videos').remove(names);
    if (e) { console.error('[retention] remove', e.message); continue; }
    removed.push(...(gone || []).map((o) => o.name));
  }

  const goneSet = new Set(removed);
  const leadIds = [...new Set(due.filter((d) => d.lead_id && goneSet.has(d.name)).map((d) => d.lead_id as string))];
  const { data: fin, error: fe } = await db().rpc('mm_retention_finish', { p_secret: secret, p_lead_ids: leadIds });
  if (fe) { console.error('[retention] finish', fe); return NextResponse.json({ error: 'db' }, { status: 500 }); }

  const result = { due: due.length, files_deleted: removed.length, ...(fin as object) };
  console.log('[retention]', JSON.stringify(result));
  return NextResponse.json(result);
}
