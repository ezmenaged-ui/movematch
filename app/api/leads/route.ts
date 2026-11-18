import { NextRequest, NextResponse, after } from 'next/server';
import { db, LeadRow, phoneRecent } from '@/lib/db';
import { notifyLead } from '@/lib/notify';
import { hasTemplate, sendWhatsApp, trySendSms, trySendWhatsApp, waEnabled } from '@/lib/whatsapp';
import { alertWithSmsBackup } from '@/lib/automations';
import { operatorAlertSms } from '@/lib/alertSms';
import { homeLeadsLive, isQaEntry, isTestLead } from '@/lib/qa';
import { siteUrl } from '@/lib/notify';
import { cleanLeadInput } from '@/lib/sanitize';
import { isValidName, isValidPhone } from '@/lib/validate';

/** "Your tender is open" SMS. Hebrew SMS segments are 67 chars, so this stays around 3 segments. */
function tenderOpenedSms(l: LeadRow) {
  const first = l.name.trim().split(/\s+/)[0];
  return [
    `היי ${first}, מכרז הובלה מס׳ ${l.tender_no} נפתח בהצלחה.`,
    'בדף המכרז שלך אפשר לראות את הצעות המחיר מהמובילים בזמן אמת ולבחור את המוביל שלך:',
    `${siteUrl()}/t/${l.client_code}`,
    'צוות MoveMatch',
  ].join('\n');
}

/**
 * "Tender opened" to the client: WhatsApp first (cheaper, richer). If WhatsApp can't be used or Twilio refuses it,
 * SMS right away; if WhatsApp later reports it couldn't deliver (e.g. no WhatsApp on that number),
 * /api/twilio/status sends the SMS then.
 */
async function sendTenderOpened(l: LeadRow) {
  if (isQaEntry(l)) return; // /qa test area: no WhatsApp or SMS to anyone
  // v2 (Utility, link written in the template) once approved; until then the original template, if configured.
  const v2 = hasTemplate('client_tender_opened_v2');
  if (waEnabled() && (v2 || hasTemplate('client_tender_opened')) && !isTestLead(l)) { // test leads: SMS only
    try {
      const first = l.name.trim().split(/\s+/)[0];
      const cb = { statusCallback: `${siteUrl()}/api/twilio/status?lead=${l.id}&kind=tender_open` };
      if (v2) await sendWhatsApp(l.phone, 'client_tender_opened_v2', [first, l.tender_no, l.client_code], cb);
      else await sendWhatsApp(l.phone, 'client_tender_opened', [first, l.tender_no, `${siteUrl()}/t/${l.client_code}`], cb);
      return;
    } catch (e) { console.error('[whatsapp:tender-open] falling back to SMS', e); }
  }
  await trySendSms('tender-open', l.phone, tenderOpenedSms(l));
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }); }
  if (body.website) return NextResponse.json({ id: 'ok', token: 'ok' }); // honeypot
  const variant = body.variant;
  if (variant !== 'a' && variant !== 'wizard' && variant !== 'form' && variant !== 'items' && variant !== 'choice') return NextResponse.json({ error: 'variant' }, { status: 400 });
  const p = cleanLeadInput(body);
  if (!isValidName(String(p.name || '')) || !isValidPhone(String(p.phone || ''))) {
    return NextResponse.json({ error: 'invalid' }, { status: 422 });
  }
  p.variant = variant;
  // Where the lead came in: 'home' (homepage, held from movers until HOME_LEADS_LIVE=1), 'qa' (/qa test area), else a live funnel.
  if (body.entry === 'qa' || (body.entry === 'home' && !homeLeadsLive())) p.entry = body.entry;
  p.user_agent = (req.headers.get('user-agent') || '').slice(0, 400);

  const { data, error } = await db().rpc('mm_create_lead', { p });
  const recent = phoneRecent(error);
  if (recent) return NextResponse.json({ error: 'phone_recent', until: recent.until }, { status: 409 });
  if (error || !data) { console.error('create lead', error); return NextResponse.json({ error: 'db' }, { status: 500 }); }
  const { id, token } = data as { id: string; token: string };

  after(async () => {
    const { data: row } = await db().rpc('mm_update_lead', { p_id: id, p_token: token, p: {} });
    if (!row) return;
    const l = row as LeadRow;
    // Every new lead: SMS the client their tender link, email the operator.
    // Funnel A is already complete here, so also WhatsApp the operator.
    await Promise.all([
      l.client_code && sendTenderOpened(l),
      notifyLead('new', l),
      l.status === 'complete' && alertWithSmsBackup('op-lead', process.env.OPERATOR_WHATSAPP || '', 'op_lead', [
        l.name, l.phone, l.city || '?', 'לא צוין', '0', '0 (משפך A, להתקשר ללקוח)', `${siteUrl()}/admin`,
      ], { kind: 'op_lead', lead: l.id }, operatorAlertSms(l, siteUrl()), { test: isTestLead(l), silent: isQaEntry(l) }),
    ]);
  });
  return NextResponse.json({ id, token });
}
