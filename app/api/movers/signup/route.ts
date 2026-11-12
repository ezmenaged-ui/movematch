import { NextRequest, NextResponse, after } from 'next/server';
import { db } from '@/lib/db';
import { sendAll, siteUrl } from '@/lib/notify';

/** Public mover sign-up (multipart form from /movers/join). Creates a pending mover and emails the operator. */
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const LOGO_MAX = 400 * 1024;

export async function POST(req: NextRequest) {
  let f: FormData;
  try { f = await req.formData(); } catch { return NextResponse.json({ error: 'bad form' }, { status: 400 }); }
  if (String(f.get('website') || '')) return NextResponse.json({ ok: true }); // honeypot

  const str = (k: string, max = 200) => String(f.get(k) || '').trim().slice(0, max);
  const phone = str('phone', 30).replace(/\D/g, '').replace(/^972/, '0');
  const company = str('company', 120);
  const url = (k: string) => { const v = str(k, 500); return v && !/^https:\/\/\S+$/.test(v) ? null : v; };
  const google_url = url('google_url'), midrag_url = url('midrag_url');
  if (company.length < 2) return NextResponse.json({ error: 'company' }, { status: 422 });
  if (!/^0\d{8,9}$/.test(phone)) return NextResponse.json({ error: 'phone' }, { status: 422 });
  if (google_url === null || midrag_url === null) return NextResponse.json({ error: 'url' }, { status: 422 });
  if (!str('consent')) return NextResponse.json({ error: 'consent' }, { status: 422 });

  let logo: string | null = null;
  const file = f.get('logo');
  if (file && typeof file === 'object' && 'size' in file && file.size > 0) {
    if (!LOGO_TYPES.includes(file.type)) return NextResponse.json({ error: 'logotype' }, { status: 422 });
    if (file.size > LOGO_MAX) return NextResponse.json({ error: 'logosize' }, { status: 422 });
    logo = `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString('base64')}`;
  }

  const p = { company, name: str('name', 120), phone, email: str('email', 200), google_url, midrag_url, note: str('note', 1000) };
  const { error } = await db().rpc('mm_mover_signup', { p, p_logo: logo });
  if (error) {
    const known = ['exists', 'invalid url', 'invalid phone', 'invalid company', 'too many'].find((k) => error.message.includes(k));
    if (!known) console.error('[mover signup]', error);
    return NextResponse.json({ error: known || 'db' }, { status: known === 'exists' ? 409 : known ? 422 : 500 });
  }

  after(() => sendAll(
    `🚚 מוביל חדש נרשם — ${company} · ${phone}`,
    [`מוביל חדש נרשם ל-MoveMatch וממתין לאישור.`, `חברה: ${company}`, p.name ? `איש קשר: ${p.name}` : '', `טלפון: ${phone}`,
      p.email ? `אימייל: ${p.email}` : '', google_url ? `Google: ${google_url}` : '', midrag_url ? `מדרג: ${midrag_url}` : '',
      p.note ? `הערה: ${p.note}` : '', logo ? 'צירף לוגו' : 'בלי לוגו', `לאישור: ${siteUrl()}/admin/movers`].filter(Boolean).join('\n'),
    { event: 'mover_signup', phone },
  ));
  return NextResponse.json({ ok: true });
}
