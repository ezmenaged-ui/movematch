import { notFound } from 'next/navigation';
import { ArrowLeft, CalendarDays, Check, Download, MessageCircle, X } from 'lucide-react';
import { BidForm } from '@/components/BidForm';
import { ItemsTable } from '@/components/ItemsTable';
import { Countdown } from '@/components/Countdown';
import '@/app/tender.css';
import { craneText, elevatorText, parkingText, roomsText, whenText } from '@/lib/validate';
import { getPublicLead, tenderRef } from '@/lib/publicLead';
import { db } from '@/lib/db';
import { MoverLogo } from '@/components/MoverLogo';
import { Blueprint, Corners, Header } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'פרטי הובלה · MoveMatch', robots: { index: false, follow: false } };

type A = Record<string, unknown> | null;
const s = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : '');
const fmtDate = (d: string) => new Date(d).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', dateStyle: 'full', timeStyle: 'short' });
const dur = (x?: number) => (x ? `${Math.floor(x / 60)}:${String(x % 60).padStart(2, '0')} דק׳` : '');
const mb = (n?: number) => (n ? `${Math.max(1, Math.round(n / 1024 / 1024))}MB` : '');

function Elevator({ v }: { v: unknown }) {
  if (v === true) return <span className="ml-yes"><Check size={15} strokeWidth={2.5} /> יש מעלית</span>;
  if (v === false) return <span className="ml-no"><X size={15} strokeWidth={2.5} /> אין מעלית (מדרגות)</span>;
  return <span className="muted">לא צוין</span>;
}

function AddressCard({ title, a, fallbackCity }: { title: string; a: A; fallbackCity?: string | null }) {
  const city = s(a?.city) || s(fallbackCity);
  return (
    <Blueprint as="section" className="ml-card">
      <h2>{title}</h2>
      {!a && !city ? <p className="muted">עוד לא התקבל</p> : (
        <dl className="ml-dl">
          {roomsText(a) && <><dt>גודל</dt><dd><b>{roomsText(a)}</b></dd></>}
          <dt>עיר</dt><dd><b>{city || '—'}</b></dd>
          <dt>כתובת</dt><dd>{s(a?.address) || '—'}</dd>
          <dt>קומה</dt><dd>{s(a?.floor) || '—'}</dd>
          <dt>דירה</dt><dd>{s(a?.apartment) || '—'}</dd>
          <dt>מעלית</dt><dd><Elevator v={a?.elevator} />{a?.elevator === true && elevatorText(a).includes('(') ? <span className="muted"> · {elevatorText(a).replace('יש מעלית ', '').replace(/[()]/g, '')}</span> : null}</dd>
          <dt>מנוף</dt><dd>{craneText(a) || <span className="muted">לא צוין</span>}</dd>
          <dt>חניה למשאית</dt><dd>{parkingText(a).replace('חניה למשאית: ', '') || <span className="muted">לא צוין</span>}</dd>
        </dl>
      )}
    </Blueprint>
  );
}

type Mover = { id: string; name: string; company: string; has_logo: boolean };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export default async function MoverLead({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ m?: string }> }) {
  const { token } = await params;
  const { m } = await searchParams;
  // Personal link from the WhatsApp ping (?m=<mover token>): the form already knows who this mover is.
  const mover = m && UUID.test(m) ? ((await db().rpc('mm_mover_by_token', { p_token: m })).data as Mover | null) : null;
  const contact = mover ? ((await db().rpc('mm_mover_lead_contact', { p_share: token, p_mover: m })).data as { name: string; phone: string } | null) : null;
  const lead = await getPublicLead(token);
  if (!lead) notFound();
  const ref = tenderRef(lead);
  const fromCity = s(lead.move_from?.city) || s(lead.city);
  const toCity = s(lead.move_to?.city);
  const op = process.env.OPERATOR_WHATSAPP;

  return (
    <>
      <Header />
      <main className="ml wrap">
        <div className="ml-head">
          <div className="kicker">מכרז מס׳ {ref} · נפתח {fmtDate(lead.created_at)}</div>
          <h1>{fromCity || '—'} <ArrowLeft size={34} strokeWidth={2} aria-label="אל" className="ml-arrow" /> {toCity || '—'}</h1>
          {lead.status !== 'complete' && <p className="ml-warn">הלקוח עוד לא השלים את כל הפרטים. נעדכן כשיתקבלו.</p>}
        </div>

        <Blueprint as="section" className="ml-card">
          <h2><CalendarDays size={20} strokeWidth={1.5} style={{ verticalAlign: '-3px' }} /> מתי</h2>
          <p className="ml-when" style={{ margin: 0 }}>{whenText(lead.move_when as never) || <span className="muted">לא צוין עדיין</span>}</p>
        </Blueprint>

        <div className="ml-grid">
          <AddressCard title="מאיפה" a={lead.move_from} fallbackCity={lead.city} />
          <AddressCard title="לאן" a={lead.move_to} />
        </div>

        {contact && (
          <Blueprint as="section" className="ml-card ml-contact">
            <h2>פרטי הלקוח</h2>
            <dl className="ml-dl">
              <dt>שם</dt><dd><b>{contact.name}</b></dd>
              <dt>טלפון</dt><dd><a href={`tel:${contact.phone}`} dir="ltr">{contact.phone}</a></dd>
            </dl>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
              <a className="btn btn-primary blueprint" href={`https://wa.me/972${contact.phone.replace(/^0/, '')}?text=${encodeURIComponent(`שלום ${contact.name.split(' ')[0]}, כאן ${mover?.company || mover?.name || 'המוביל'} מ-MoveMatch, לגבי ההובלה שלך (מכרז ${ref}).`)}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}><Corners /><MessageCircle size={17} strokeWidth={1.5} /> וואטסאפ ללקוח</a>
              <a className="btn btn-secondary" href={`tel:${contact.phone}`} style={{ textDecoration: 'none' }}>התקשרות</a>
            </div>
            <p className="small muted" style={{ margin: '10px 0 0' }}>הפרטים נמסרים לצורך הצעת מחיר ותיאום ההובלה הזו בלבד.</p>
          </Blueprint>
        )}
        {lead.items?.list?.length && lead.videos.length > 0 ? <p className="ml-card" style={{ margin: 0 }}>🎁 הלקוח צירף גם סרטון וגם רשימת פריטים. אם יזמין אותך דרך MoveMatch, הוא זכאי ל-50 ₪ הנחה מהמחיר הסופי (סעיף 5 בהסכם המובילים).</p> : null}
        {lead.items?.list?.length ? (
          <Blueprint as="section" className="ml-card">
            <h2>רשימת הפריטים</h2>
            <ItemsTable items={lead.items} />
          </Blueprint>
        ) : null}
        <Blueprint as="section" className="ml-card">
          <h2>סרטונים של מה שעובר {lead.videos.length > 0 && <span className="muted small">({lead.videos.length})</span>}</h2>
          {lead.videos.length === 0 ? (
            <p className="muted">{lead.video_skipped ? 'הלקוח עוד לא צילם. אנחנו אוספים ממנו את הסרטון ונשלח קישור מעודכן.' : 'עוד לא הועלו סרטונים.'}</p>
          ) : (
            <div className="ml-videos">
              {lead.videos.map((v, i) => (
                <figure key={v.path} className="ml-video">
                  <video controls preload="metadata" playsInline src={`/l/${token}/video/${i}`} />
                  <figcaption>
                    <span>סרטון {i + 1} {dur(v.duration_s)} {mb(v.size)}</span>
                    <a href={`/l/${token}/video/${i}?download=1`}><Download size={14} /> הורדה</a>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </Blueprint>

        <Blueprint as="section" className="ml-card ml-cta" id="quote">
          <h2>הצעת המחיר שלכם</h2>
          <p className="muted" style={{ marginTop: -6 }}>מלאו מחיר וטלפון ושלחו. אנחנו מעבירים ללקוח ומחברים ביניכם אם בחר בכם.</p>
          {lead.closes_at && lead.now && <Countdown closesAt={lead.closes_at} serverNow={lead.now} variant="bar" />}
          {lead.closes_at && lead.now && new Date(lead.closes_at) <= new Date(lead.now)
            ? <p className="ml-warn">המכרז נסגר ולא ניתן להגיש בו הצעות חדשות.</p>
            : <BidForm token={token} mover={mover ? { token: m!, company: mover.company || mover.name, logo: <MoverLogo id={mover.id} hasLogo={mover.has_logo} name={mover.company || mover.name} size={44} /> } : undefined} requestedDate={s(lead.move_when?.date)} requestedText={whenText(lead.move_when as never)} />}
          {op && <p className="small muted" style={{ margin: '14px 0 0' }}>שאלה על ההובלה? <a href={`https://wa.me/${op}?text=${encodeURIComponent(`שאלה על מכרז ${ref}: `)}`} target="_blank" rel="noreferrer"><MessageCircle size={13} style={{ verticalAlign: '-2px' }} /> כתבו לנו בוואטסאפ</a></p>}
        </Blueprint>
      </main>
    </>
  );
}
