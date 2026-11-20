import { AdminHero, AdminShell, StatCard } from '@/components/AdminShell';
import { headers } from 'next/headers';
import { CircleCheck, ChevronDown, Inbox, MessageCircle, Phone, Send, Truck, UserRoundX } from 'lucide-react';
import { db, LeadRow } from '@/lib/db';
import { tenderRef } from '@/lib/publicLead';
import { ItemsTable } from '@/components/ItemsTable';
import { LeadsFilter } from '@/components/LeadsFilter';
import { craneText, elevatorText, parkingText, roomsText, whenText } from '@/lib/validate';
import { CloseCard, CopyButton } from '@/components/CopyButton';
import { setBidHidden, setHandled } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Leads · MoveMatch', robots: { index: false } };

type Bid = { id: string; lead_id: string; price: number; mover_phone: string; mover_name: string | null; available_date: string | null; available_flexible: boolean; note: string | null; hidden: boolean; created_at: string };
type Lead = LeadRow & { client_token: string; movers_pinged_at: string | null; movers_pinged_count: number | null; priority: number | null };
const PRIO: Record<number, string> = { 1: 'שירות פרימיום', 2: 'בעיקר שירות', 3: 'איזון', 4: 'בעיקר מחיר', 5: 'המחיר הנמוך' };

const V: Record<string, string> = { a: 'A · חזרה', wizard: 'B · פריטים', form: 'C · טופס', items: 'D · פריטים+סרטון', choice: 'E · סרטון או פריטים', chat: 'F · וואטסאפ' };
const fmt = (d: string) => new Date(d).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', dateStyle: 'short', timeStyle: 'short' });
const dShort = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
const wa = (phone: string, text?: string) => `https://wa.me/972${phone.replace(/^0/, '')}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
const cityOf = (a: Record<string, unknown> | null) => (a?.city as string) || '';
const elev = (v: unknown) => (v === true ? 'יש מעלית' : v === false ? 'מדרגות בלבד' : 'לא צוין');
const bidDate = (b: Bid) => (b.available_flexible ? 'גמיש' : b.available_date ? dShort(b.available_date) : '—');

function Addr({ title, a, fallback }: { title: string; a: Record<string, unknown> | null; fallback?: string | null }) {
  return (
    <div className="adm-box">
      <h4>{title}</h4>
      {!a && !fallback ? <span className="muted">—</span> : (
        <dl className="adm-dl">
          {roomsText(a) && <><dt>גודל</dt><dd><b>{roomsText(a)}</b></dd></>}
          <dt>עיר</dt><dd>{cityOf(a) || fallback || '—'}</dd>
          <dt>כתובת</dt><dd>{(a?.address as string) || '—'}</dd>
          <dt>קומה / דירה</dt><dd>{(a?.floor as string) || '—'} / {(a?.apartment as string) || '—'}</dd>
          <dt>מעלית</dt><dd>{elevatorText(a) || elev(a?.elevator)}</dd>
          <dt>מנוף</dt><dd>{craneText(a) || '—'}</dd>
          <dt>חניה למשאית</dt><dd>{parkingText(a).replace('חניה למשאית: ', '') || '—'}</dd>
        </dl>
      )}
    </div>
  );
}

const STATUS: Record<string, string> = { complete: 'מלאים', partial: 'לא סיימו', offers: 'עם הצעות', open: 'לא טופלו', handled: 'טופלו' };

export default async function Admin({ searchParams }: { searchParams: Promise<{ q?: string; f?: string; v?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q || '').trim();
  const fs = (sp.f || '').split(',').filter((x) => STATUS[x]);
  const vs = (sp.v || '').split(',').filter((x) => V[x]);
  const [{ data, error }, { data: bidData }] = await Promise.all([
    db().rpc('mm_admin_list', { p_secret: process.env.MM_ADMIN_SECRET, p_limit: 500 }),
    db().rpc('mm_admin_bids', { p_secret: process.env.MM_ADMIN_SECRET }),
  ]);
  if (error) return <main style={{ padding: 24 }}>שגיאה בטעינת לידים: {error.message}</main>;
  const allLeads = (data || []) as Lead[];
  const bidsBy = new Map<string, Bid[]>();
  for (const b of (bidData || []) as Bid[]) bidsBy.set(b.lead_id, [...(bidsBy.get(b.lead_id) || []), b]);

  const h = await headers();
  const origin = `https://${h.get('x-forwarded-host') || h.get('host')}`;

  const leads = allLeads.filter((l) => {
    if (vs.length && !vs.includes(l.variant)) return false;
    if (fs.length && !fs.some((x) =>
      (x === 'complete' && l.status === 'complete') || (x === 'partial' && l.status === 'partial') ||
      (x === 'offers' && (bidsBy.get(l.id) || []).length > 0) || (x === 'open' && !l.handled) || (x === 'handled' && l.handled))) return false;
    if (q) {
      const hay = `${l.name} ${l.phone} ${l.city || ''} ${cityOf(l.move_from)} ${cityOf(l.move_to)} ${l.tender_no || ''}`;
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const { data: moverData } = await db().rpc('mm_admin_movers', { p_secret: process.env.MM_ADMIN_SECRET });
  const movers = (moverData || []) as { status: string }[];
  const pending = movers.filter((m) => m.status === 'pending').length;
  const nComplete = allLeads.filter((l) => l.status === 'complete').length;
  const nOffers = allLeads.filter((l) => (bidsBy.get(l.id) || []).length).length;
  const nOpen = allLeads.filter((l) => !l.handled).length;

  const stats = (['a', 'wizard', 'form', 'items', 'choice'] as const).map((v) => {
    const ls = allLeads.filter((l) => l.variant === v);
    const c = ls.filter((l) => l.status === 'complete').length;
    return { v, total: ls.length, complete: c, rate: ls.length ? Math.round((c / ls.length) * 100) : 0 };
  });

  return (
    <AdminShell active="leads" title="לידים" counts={{ leads: allLeads.length, movers: movers.length - pending, pending }}>
      <AdminHero kicker="סביבת ניהול" title="לידים" sub="כל הפניות, ההצעות מהמובילים והמעקב אחרי כל הובלה." />
      <div className="mmx-stats">
        <StatCard icon={<Inbox size={20} />} n={allLeads.length} label="לידים" />
        <StatCard icon={<CircleCheck size={20} />} n={nComplete} label="השלימו פרטים" />
        <StatCard icon={<Send size={20} />} n={nOffers} label="עם הצעות מחיר" />
        <StatCard icon={<UserRoundX size={20} />} n={nOpen} label="לא טופלו" />
      </div>
      <div className="mmx-funnels">
        {stats.filter((x) => x.total).map((x) => <span key={x.v}>משפך {V[x.v]}: <b>{x.total}</b> · {x.rate}% השלמה</span>)}
      </div>

      <div className="mmx-bar">
        <h2>פניות {leads.length !== allLeads.length ? `(${leads.length} מתוך ${allLeads.length})` : ''}</h2>
        <LeadsFilter statuses={Object.entries(STATUS).map(([v, label]) => ({ v, label }))} funnels={Object.entries(V).map(([v, label]) => ({ v, label }))} />
      </div>
      {leads.length === 0 && <div className="mmx-empty">אין פניות שמתאימות לסינון.</div>}

      <div className="adm-list">
        {leads.map((l) => {
          const bids = bidsBy.get(l.id) || [];
          const visible = bids.filter((b) => !b.hidden);
          const ref = tenderRef(l);
          const from = cityOf(l.move_from) || l.city || '';
          const to = cityOf(l.move_to);
          const route = `${from || '?'} ← ${to || '?'}`;
          const moverLink = `${origin}/l/${l.share_token}`;
          const clientLink = l.client_code ? `${origin}/t/${l.client_code}` : `${origin}/o/${l.client_token}`;
          const moverMsg = `מכרז הובלה חדש ${ref}: ${route}${l.move_when ? ` · ${whenText(l.move_when as never)}` : ''}\nכל הפרטים, הסרטונים והגשת הצעת מחיר:\n${moverLink}`;
          const firstName = l.name.split(' ')[0];
          const clientMsg = `היי ${firstName}, ${visible.length === 1 ? 'התקבלה הצעה' : `התקבלו ${visible.length} הצעות`} במכרז ההובלה שלך מס׳ ${ref} (${route}). אפשר לראות ולבחור כאן:\n${clientLink}`;
          return (
            <details key={l.id} className={`adm-lead ${l.handled ? 'handled' : ''}`}>
              <summary>
                <span className="adm-ico" aria-hidden><Truck size={20} strokeWidth={1.75} /></span>
                <span className="adm-route">{route}<small>מכרז #{ref}</small></span>
                <span className="adm-name"><b>{l.name}</b><small>{l.phone}</small></span>
                <span className="adm-when"><b>{fmt(l.created_at)}</b></span>
                <span className="adm-tags">
                  <span className={`adm-tag ${l.status === 'complete' ? 'ok' : 'warn'}`}>{l.status === 'complete' ? 'מלא' : `חלקי · שלב ${l.furthest_step}`}</span>
                  <span className="adm-tag">{V[l.variant]}</span>
                  {l.videos.length > 0 && <span className="adm-tag">🎥 {l.videos.length}</span>}
                  {l.video_skipped && <span className="adm-tag warn">להתקשר לסרטון</span>}
                  {bids.length > 0 && <span className="adm-tag ok">💰 {bids.length} · מ־₪{Math.min(...bids.map((b) => b.price)).toLocaleString('he-IL')}</span>}
                  {l.priority && <span className="adm-tag">{l.priority <= 2 ? '⭐' : l.priority >= 4 ? '₪' : '⚖️'} {PRIO[l.priority]}</span>}
                  {l.handled && <span className="adm-tag">טופל</span>}
                </span>
                <ChevronDown size={18} className="adm-chev" aria-hidden />
              </summary>

              <div className="adm-body">
                <div className="adm-grid">
                  <div className="adm-box">
                    <h4>לקוח</h4>
                    <dl className="adm-dl">
                      <dt>שם</dt><dd>{l.name}</dd>
                      <dt>טלפון</dt><dd><a href={`tel:${l.phone}`} dir="ltr">{l.phone}</a></dd>
                      <dt>מתי</dt><dd>{whenText(l.move_when as never) || '—'}</dd>
                      <dt>מקור</dt><dd>{[l.utm_source, l.utm_medium, l.utm_campaign].filter(Boolean).join(' / ') || '—'}</dd>
                      <dt>מכרז</dt><dd>{ref}</dd>
                      <dt>העדפה</dt><dd>{l.priority ? `${PRIO[l.priority]} (${l.priority}/5)` : '—'}</dd>
                    </dl>
                    <div className="adm-actions">
                      <a className="btn btn-secondary adm-btn" href={`tel:${l.phone}`}><Phone size={14} /> התקשרות</a>
                      <a className="btn btn-secondary adm-btn" href={wa(l.phone)} target="_blank" rel="noreferrer"><MessageCircle size={14} /> וואטסאפ</a>
                    </div>
                  </div>
                  <Addr title="מאיפה" a={l.move_from} fallback={l.city} />
                  <Addr title="לאן" a={l.move_to} />
                </div>

                {l.items?.list?.length ? <div className="adm-box"><h4>פריטים</h4><ItemsTable items={l.items} /></div> : null}
                {l.videos.length > 0 && (
                  <div className="adm-box">
                    <h4>סרטונים ({l.videos.length})</h4>
                    <div className="adm-videos">
                      {l.videos.map((v) => {
                        const src = `/admin/video?path=${encodeURIComponent(v.path)}&parts=${v.parts || 1}`;
                        return (
                          <figure key={v.path}>
                            <video controls preload="none" playsInline src={src} />
                            <figcaption><a href={`${src}&download=1`}>הורדה</a></figcaption>
                          </figure>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="adm-box">
                  <h4>1. שליחה למובילים</h4>
                  <p className="small muted" style={{ margin: '0 0 8px' }}>דף ההובלה. מובילים מאושרים (מהקישור האישי) רואים בו גם את שם הלקוח והטלפון, ומגישים הצעת מחיר.</p>
                  {l.movers_pinged_at && l.movers_pinged_count ? <p className="small" style={{ margin: '0 0 8px' }}>✅ נשלח אוטומטית בוואטסאפ ל-{l.movers_pinged_count} מובילים ({fmt(l.movers_pinged_at)})</p> : null}
                  <div className="adm-link"><a href={moverLink} target="_blank" rel="noreferrer" dir="ltr">{moverLink}</a></div>
                  <div className="adm-actions">
                    <CopyButton text={moverLink} label="העתקת קישור" />
                    <CopyButton text={moverMsg} label="העתקת הודעה למוביל" />
                    <a className="btn btn-secondary adm-btn" href={`https://wa.me/?text=${encodeURIComponent(moverMsg)}`} target="_blank" rel="noreferrer"><MessageCircle size={14} /> שליחה למוביל בוואטסאפ</a>
                  </div>
                </div>

                <div className="adm-box">
                  <h4>2. הצעות שהתקבלו ({bids.length})</h4>
                  {bids.length === 0 ? <span className="muted">עוד אין הצעות.</span> : (
                    <div className="adm-bids">
                      {bids.map((b) => {
                        const offerTxt = `הצעה להובלה שלך (${route}): ₪${b.price.toLocaleString('he-IL')}${b.available_flexible ? ', תאריך גמיש' : b.available_date ? `, פנוי ב־${dShort(b.available_date)}` : ''}${b.note ? `. ${b.note}` : ''}`;
                        return (
                          <div key={b.id} className={`adm-bid ${b.hidden ? 'hidden' : ''}`}>
                            <div className="adm-bid-main">
                              <b className="adm-price">₪{b.price.toLocaleString('he-IL')}</b>
                              <span>{b.mover_name || 'מוביל'} · <a href={`tel:${b.mover_phone}`} dir="ltr">{b.mover_phone}</a> · <a href={wa(b.mover_phone)} target="_blank" rel="noreferrer">WA</a></span>
                              <span className="muted">תאריך: {bidDate(b)}</span>
                              {b.note && <span className="muted">“{b.note}”</span>}
                              {b.hidden && <span className="adm-tag warn">מוסתר מהלקוח</span>}
                            </div>
                            <div className="adm-actions">
                              <CopyButton text={offerTxt} label="העתקה ללקוח" />
                              <a className="btn btn-secondary adm-btn" href={wa(l.phone, offerTxt)} target="_blank" rel="noreferrer"><MessageCircle size={14} /> שליחה ללקוח</a>
                              <form action={setBidHidden.bind(null, b.id, !b.hidden)}><button className="btn btn-secondary adm-btn" type="submit">{b.hidden ? 'הצגה ללקוח' : 'הסתרה מהלקוח'}</button></form>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="adm-box">
                  <h4>3. דף המכרז של הלקוח</h4>
                  <p className="small muted" style={{ margin: '0 0 8px' }}>כל ההצעות המוצגות ({visible.length}), בלי פרטי המובילים. הלקוח בוחר הצעה ופונה אליכם בוואטסאפ.</p>
                  <div className="adm-link"><a href={clientLink} target="_blank" rel="noreferrer" dir="ltr">{clientLink}</a></div>
                  <div className="adm-actions">
                    <CopyButton text={clientLink} label="העתקת קישור" />
                    <CopyButton text={clientMsg} label="העתקת הודעה ללקוח" />
                    <a className="btn btn-primary adm-btn" href={wa(l.phone, clientMsg)} target="_blank" rel="noreferrer"><MessageCircle size={14} /> שליחה ללקוח בוואטסאפ</a>
                  </div>
                </div>

                <div className="adm-close">
                  <form action={setHandled.bind(null, l.id, !l.handled)}>
                    <button className="btn btn-secondary adm-btn" type="submit">{l.handled ? 'סימון כלא טופל' : 'סימון כטופל'}</button>
                  </form>
                  <CloseCard />
                </div>
              </div>
            </details>
          );
        })}
      </div>
    </AdminShell>
  );
}
