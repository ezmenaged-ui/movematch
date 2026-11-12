import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, CalendarCheck, ChevronDown, CalendarDays, Check, Download, MessageCircle, Phone, X } from 'lucide-react';
import { MoverShell } from '@/components/MoverShell';
import { BidForm } from '@/components/BidForm';
import { Countdown } from '@/components/Countdown';
import { ItemsTable } from '@/components/ItemsTable';
import { MoverLogo } from '@/components/MoverLogo';
import { BID_STATE_LABEL, bidState, moverDb, requireMe, tabOf, type MoverLeadFull } from '@/lib/mover';
import { dayHe, hhmm, nis, routeText, stamp } from '@/lib/moverFormat';
import { elevatorText, whenText } from '@/lib/validate';
import { tenderRef } from '@/lib/publicLead';
import type { Crew } from '@/lib/crew';
import { bookJob, setJobDone, unbookJob } from '../../actions';
import '@/app/tender.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'פרטי פנייה · MoveMatch', robots: { index: false, follow: false } };

type A = Record<string, unknown> | null;
const s = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : '');
const dur = (x?: number) => (x ? `${Math.floor(x / 60)}:${String(Math.round(x % 60)).padStart(2, '0')} דק׳` : '');
const BACK_LABEL = { new: 'לכל הפניות החדשות', offers: 'להצעות שנשלחו', history: 'להיסטוריה' } as const;
const PRIO: Record<number, string> = { 1: 'שירות פרימיום', 2: 'בעיקר שירות', 3: 'איזון בין מחיר לשירות', 4: 'בעיקר מחיר', 5: 'המחיר הנמוך ביותר' };
const MSG: Record<string, [string, string]> = {
  booked: ['ok', 'ההובלה נשמרה ביומן.'], done: ['ok', 'ההובלה סומנה כהושלמה.'],
  date: ['warn', 'נא לבחור תאריך הובלה.'], hours: ['warn', 'שעת הסיום צריכה להיות אחרי שעת ההתחלה.'], book: ['warn', 'השמירה נכשלה. נסו שוב.'],
};

function Stop({ title, a, fallbackCity }: { title: string; a: A; fallbackCity?: string | null }) {
  const city = s(a?.city) || s(fallbackCity);
  return (
    <div className="mv-stop">
      <h3>{title}</h3>
      {!a && !city ? <p className="mv-meta">לא התקבל</p> : (
        <dl className="mv-dl">
          <dt>עיר</dt><dd><b>{city || '—'}</b></dd>
          <dt>כתובת</dt><dd>{s(a?.address) || '—'}</dd>
          <dt>קומה</dt><dd>{s(a?.floor) || '—'}{s(a?.apartment) ? ` · דירה ${s(a?.apartment)}` : ''}</dd>
          <dt>מעלית</dt><dd>{a?.elevator === true ? <><Check size={14} /> {elevatorText(a)}</> : a?.elevator === false ? <><X size={14} /> רק מדרגות</> : 'לא צוין'}</dd>
        </dl>
      )}
    </div>
  );
}

export default async function MoverLeadPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const me = await requireMe();
  const sb = await moverDb();
  const [{ data }, { data: crewData }] = await Promise.all([sb.rpc('mm_mover_lead', { p_id: id }), sb.rpc('mm_mover_crew')]);
  if (!data) notFound();
  const crew = (crewData || []) as Crew[];
  const l = data as MoverLeadFull;
  const ref = tenderRef(l);
  const b = l.my_bid;
  const st = bidState(l);
  const tab = tabOf(l);
  const back = tab === 'new' ? '/movers' : `/movers/${tab}`;
  const company = me.company_name || me.name;
  const reqDate = s(l.move_when?.date);
  const first = l.client.name.split(' ')[0];
  const wa = `https://wa.me/972${l.client.phone.replace(/^0/, '')}?text=${encodeURIComponent(`שלום ${first}, כאן ${company} מ-MoveMatch, לגבי ההובלה שלך (מכרז ${ref}).`)}`;
  const note = (sp.ok && MSG[sp.ok]) || (sp.error && MSG[sp.error]);

  return (
    <MoverShell me={me} active={tab} title={`פנייה #${ref}`}>
      <div className="mv-sticky">
        <Link href={back} className="btn btn-secondary mv-sticky-back"><ArrowRight size={17} /> {BACK_LABEL[tab]}</Link>
        <span className="mv-sticky-title"><b>{routeText(l)}</b><small>מכרז #{ref}</small></span>
        {l.open && !b?.booked_at
          ? <a href="#offer" className="btn btn-primary mv-sticky-cta">{b ? 'עדכון ההצעה' : 'להגשת הצעה'} <ChevronDown size={16} /></a>
          : b ? <a href="#booking" className="btn btn-secondary mv-sticky-cta">{b.booked_at ? 'פרטי ההובלה' : 'הלקוח בחר בכם?'} <ChevronDown size={16} /></a> : null}
      </div>
      {note && <p className={`mv-note ${note[0]}`} role="status">{note[1]}</p>}
      <section className="mmx-hero">
        <span className="mmx-kicker">מכרז מס׳ {ref} · נפתח {stamp(l.created_at)}</span>
        <h1>{routeText(l)}</h1>
        <p style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className={`mv-pill ${st === 'sent' ? 'blue' : st === 'none' || st === 'booked' ? '' : 'grey'}`}>{BID_STATE_LABEL[st]}</span>
          <span>{l.bid_count} הצעות במכרז</span>
          {l.priority ? <span>· הלקוח מעדיף: {PRIO[l.priority]}</span> : null}
        </p>
      </section>

      <div className="mv-card">
        <h2><CalendarDays size={20} strokeWidth={1.6} /> פרטי המעבר</h2>
        <p style={{ margin: '0 0 14px' }}><b>מתי:</b> {whenText(l.move_when as never) || 'לא צוין'}</p>
        <div className="mv-grid2">
          <Stop title="איסוף · מאיפה" a={l.move_from} fallbackCity={l.city} />
          <Stop title="פריקה · לאן" a={l.move_to} />
        </div>
      </div>

      <div className="mv-card">
        <h2>פרטי הלקוח</h2>
        <dl className="mv-dl"><dt>שם</dt><dd><b>{l.client.name}</b></dd><dt>טלפון</dt><dd><a href={`tel:${l.client.phone}`} dir="ltr">{l.client.phone}</a></dd></dl>
        <div className="mv-actions">
          <a className="btn btn-primary" href={wa} target="_blank" rel="noreferrer"><MessageCircle size={16} /> וואטסאפ ללקוח</a>
          <a className="btn btn-secondary" href={`tel:${l.client.phone}`}><Phone size={16} /> התקשרות</a>
        </div>
        <p className="mv-meta" style={{ margin: '10px 0 0' }}>הפרטים נמסרים לצורך הצעת מחיר ותיאום ההובלה הזו בלבד.</p>
      </div>

      {l.items?.list?.length ? <div className="mv-card"><h2>רשימת הפריטים</h2><ItemsTable items={l.items} /></div> : null}

      <div className="mv-card">
        <h2>סרטונים {l.videos.length > 0 && <span className="mv-meta">({l.videos.length})</span>}</h2>
        {l.videos.length === 0 ? <p className="mv-meta" style={{ margin: 0 }}>{l.video_skipped ? 'הלקוח עוד לא צילם. נעדכן כשיגיע סרטון.' : 'לא הועלו סרטונים.'}</p> : (
          <div className="mv-videos">
            {l.videos.map((v, i) => (
              <figure key={v.path}>
                <video controls preload="metadata" playsInline src={`/l/${l.share_token}/video/${i}`} />
                <figcaption><span>סרטון {i + 1} {dur(v.duration_s)}</span><a href={`/l/${l.share_token}/video/${i}?download=1`}><Download size={13} /> הורדה</a></figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>

      {/* Offer */}
      <div className="mv-card" id="offer">
        <h2>{b ? 'ההצעה שלכם' : 'הצעת מחיר'}</h2>
        {b && (
          <div className="mv-offer" style={{ marginBottom: 14 }}>
            <span className="mv-price">{nis(b.price)}</span><span className="mv-meta">כולל מע״מ</span>
            <span>{b.available_flexible ? 'גמישים בתאריך' : b.available_date ? `פנויים ב${dayHe(b.available_date)}` : 'תאריך יתואם'}</span>
            {b.note && <span className="mv-meta">“{b.note}”</span>}
            <span className="mv-meta">עודכן {stamp(b.updated_at)}</span>
          </div>
        )}
        {l.open && l.closes_at && !b?.booked_at && <div style={{ marginBottom: 12 }}><Countdown closesAt={l.closes_at} serverNow={l.now} variant="bar" /></div>}
        {!b?.booked_at && (l.open
          ? <BidForm token={l.share_token} endpoint={`/movers/api/bids/${l.id}`} initial={b}
              mover={{ token: '', company, logo: <MoverLogo id={me.id} hasLogo={me.has_logo} name={company} size={44} /> }}
              requestedDate={reqDate} requestedText={whenText(l.move_when as never)}
              onDoneText="ההצעה מופיעה אצל הלקוח בדף המכרז, עם הלוגו, הדירוגים ופרטי הקשר שלכם. אפשר לעדכן אותה עד שהמכרז נסגר." />
          : <p className="mv-note warn" style={{ marginTop: 4 }}>{b ? 'המכרז נסגר. ההצעה שלכם נשארת אצל הלקוח.' : 'המכרז נסגר ולא ניתן להגיש בו הצעות.'}</p>)}
      </div>

      {/* Booking: the mover marks that the client chose them */}
      {b && (
        <div className="mv-card" id="booking">
          <h2><CalendarCheck size={20} strokeWidth={1.6} /> {b.booked_at ? 'ההובלה נקבעה' : 'הלקוח בחר בכם?'}</h2>
          {b.booked_at && b.job_date && <p style={{ margin: '0 0 10px' }}><b>{dayHe(b.job_date)}{b.job_time ? ` · ${hhmm(b.job_time)}${b.job_end_time ? `–${hhmm(b.job_end_time)}` : ''}` : ' · ללא שעה'}</b>{b.job_done_at ? ' · הושלמה ✓' : ''}
            {(b.crew_ids || []).length > 0 && <span className="mv-meta"> · צוות: {crew.filter((c) => b.crew_ids.includes(c.id)).map((c) => c.full_name).join(', ')}</span>}</p>}
          {!b.booked_at && <p className="mv-meta" style={{ margin: '0 0 6px' }}>סגרתם עם הלקוח? קבעו תאריך ושעה וההובלה תיכנס ליומן שלכם.</p>}
          {!b.job_done_at && (
            <form action={bookJob} className="mv-fields" style={{ alignItems: 'end' }}>
              <input type="hidden" name="bid" value={b.id} /><input type="hidden" name="lead" value={l.id} />
              <div className="field"><label htmlFor="bk-date">תאריך הובלה</label><input id="bk-date" name="date" type="date" className="input" required defaultValue={b.job_date || b.available_date || reqDate} dir="ltr" /></div>
              <div className="field"><label htmlFor="bk-time">משעה</label><input id="bk-time" name="time" type="time" className="input" defaultValue={hhmm(b.job_time) || '08:00'} dir="ltr" /></div>
              <div className="field"><label htmlFor="bk-end">עד שעה (לא חובה)</label><input id="bk-end" name="end" type="time" className="input" defaultValue={hhmm(b.job_end_time) || '12:00'} dir="ltr" /></div>
              <fieldset className="wide mv-crew-pick"><legend>מי בצוות? {crew.length === 0 && <Link href="/movers/crew" className="mv-back">הוספת עובדים ‹</Link>}</legend>
                {crew.map((c) => <label key={c.id}><input type="checkbox" name="crew" value={c.id} defaultChecked={(b.crew_ids || []).includes(c.id)} /> {c.full_name}</label>)}
              </fieldset>
              <div className="wide"><button type="submit" className="btn btn-primary"><CalendarCheck size={16} /> {b.booked_at ? 'עדכון המועד והצוות' : 'הלקוח בחר בי · שמירה ביומן'}</button></div>
            </form>
          )}
          {b.booked_at && (
            <div className="mv-actions">
              <Link className="btn btn-secondary" href={`/movers/calendar?w=${b.job_date}`}><CalendarDays size={16} /> ביומן</Link>
              <a className="btn btn-secondary" href={`/j/${b.sheet_token}`} target="_blank" rel="noreferrer">דף עבודה לצוות</a>
              <form action={setJobDone.bind(null, b.id, l.id, !b.job_done_at)}><button type="submit" className="btn btn-secondary">{b.job_done_at ? 'ביטול סימון "הושלמה"' : <><Check size={16} /> סימון כהושלמה</>}</button></form>
              {!b.job_done_at && <form action={unbookJob.bind(null, b.id, l.id)}><button type="submit" className="btn btn-secondary">ביטול ההזמנה</button></form>}
            </div>
          )}
        </div>
      )}
    </MoverShell>
  );
}
