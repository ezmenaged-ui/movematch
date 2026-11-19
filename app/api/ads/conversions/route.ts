import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { db } from '@/lib/db';

/**
 * Google Ads offline conversion file (Goals → Conversions → Uploads → Schedules → HTTPS), so booked moves (and qualified
 * leads, if you want them from here rather than from GA4) reach Google Ads without anyone reporting them by hand.
 *   GET /api/ads/conversions?k=<ADS_EXPORT_KEY>[&days=30]
 * Rows: every real lead with a Google Ads click id (gclid) that qualified ("MM Qualified Lead") or was booked by a mover
 * ("MM Booked Move", value = the job price) in the last `days` days (default 30, max 90). Re-uploading a row is safe:
 * Google Ads skips a click + conversion name + time it already has.
 * Only gclid rows: WhatsApp (funnel F) leads have no click id and cannot be matched to a click (see TRACKING.md).
 * Without ADS_EXPORT_KEY in Vercel the endpoint answers 404.
 */
const NAMES = { qualified: 'MM Qualified Lead', booked: 'MM Booked Move' } as const;
type Row = { kind: keyof typeof NAMES; lead_id: string; at: string; value: number | null; gclid: string | null };

const israelTime = (iso: string) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
};
const csv = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export async function GET(req: NextRequest) {
  const key = process.env.ADS_EXPORT_KEY || '';
  const k = req.nextUrl.searchParams.get('k') || '';
  if (key.length < 16 || k.length !== key.length || !timingSafeEqual(Buffer.from(k), Buffer.from(key))) {
    return new NextResponse('not found', { status: 404 });
  }
  const days = Math.min(90, Math.max(1, Number(req.nextUrl.searchParams.get('days')) || 30));
  const since = new Date(Date.now() - days * 864e5).toISOString();
  const { data, error } = await db().rpc('mm_ads_conversions', { p_secret: process.env.MM_ADMIN_SECRET, p_since: since });
  if (error) { console.error('[ads export]', error.message); return new NextResponse('error', { status: 500 }); }
  const rows = ((data || []) as Row[]).filter((r) => r.gclid && r.at);
  const lines = [
    'Parameters:TimeZone=Asia/Jerusalem',
    'Google Click ID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency',
    ...rows.map((r) => [csv(r.gclid!), NAMES[r.kind], israelTime(r.at), r.value != null ? String(r.value) : '', r.value != null ? 'ILS' : ''].join(',')),
  ];
  return new NextResponse(lines.join('\n') + '\n', {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  });
}
