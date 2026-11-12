import { NextRequest, NextResponse, after } from 'next/server';
import { db, LeadRow, phoneRecent } from '@/lib/db';
import { notifyLead } from '@/lib/notify';
import { onLeadComplete } from '@/lib/automations';
import { cleanLeadInput } from '@/lib/sanitize';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }); }
  const token = String(body.token || '');
  if (!UUID.test(id) || !UUID.test(token)) return NextResponse.json({ error: 'bad id' }, { status: 400 });
  const p = cleanLeadInput(body);
  if (p.add_video && !(p.add_video as { path: string }).path.startsWith(id + '/')) delete p.add_video;

  const { data, error } = await db().rpc('mm_update_lead', { p_id: id, p_token: token, p });
  const recent = phoneRecent(error);
  if (recent) return NextResponse.json({ error: 'phone_recent', until: recent.until }, { status: 409 });
  if (error || !data) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const row = data as LeadRow;

  if (p.status === 'complete') after(() => onLeadComplete(row, { pingMovers: row.variant !== 'a' }));
  else if (p.add_video && row.status === 'complete') after(() => notifyLead('video', row));
  return NextResponse.json({ ok: true, status: row.status, furthest_step: row.furthest_step });
}
