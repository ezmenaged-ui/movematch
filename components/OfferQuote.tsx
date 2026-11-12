import { ArrowLeft, CalendarDays, MessageCircle, Phone, ShieldCheck } from 'lucide-react';
import { MoverLogo } from './MoverLogo';
import { MoverRatings } from './MoverRatings';
import { cityOf, nis, offerDate, offerName, phoneDisplay, Tender, TenderOffer, waLink } from '@/lib/tender';
import { whenText } from '@/lib/validate';

const issued = (d: string) => new Date(d).toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem', day: 'numeric', month: 'long', year: 'numeric' });

/** One mover's offer laid out as an official quote: mover header, price, notes, contact and actions. */
export function OfferQuote({ t, o, n, best, compact = false }: { t: Tender; o: TenderOffer; n: number; best: boolean; compact?: boolean }) {
  const name = offerName(o, n);
  const quoteNo = `${t.tender_no}-${n}`;
  const from = cityOf(t.move_from, t.city), to = cityOf(t.move_to);
  const toMover = `שלום, הגעתי דרך MoveMatch. אני מעוניין/ת בהצעה שלכם מס׳ ${quoteNo} (${nis(o.price)}) להובלה ${from || ''} ← ${to || ''}.`;
  return (
    <article className={`tp-quote ${best ? 'best' : ''}`} id={`offer-${n}`}>
      <header className="tp-q-head">
        <MoverLogo id={o.mover_id} hasLogo={o.has_logo} name={name} size={compact ? 56 : 72} />
        <div className="tp-q-mover">
          <h2>{name}</h2>
          {o.mover_id ? <span className="tp-q-ok"><ShieldCheck size={15} strokeWidth={2} /> מוביל מאושר MoveMatch</span> : <span className="tp-q-sub">מוביל משתתף במכרז</span>}
          <MoverRatings o={o} />
        </div>
        <dl className="tp-q-meta">
          <dt>הצעה</dt><dd dir="ltr">{quoteNo}</dd>
          <dt>תאריך</dt><dd>{issued(o.created_at)}</dd>
        </dl>
      </header>
      {!compact && (
        <div className="tp-q-for">
          <div><span>לכבוד</span><b>{t.name || 'הלקוח'}</b></div>
          <div><span>מסלול</span><b>{from || '—'} <ArrowLeft size={14} aria-label="אל" /> {to || '—'}</b></div>
          {t.move_when && <div><span>מועד מבוקש</span><b>{whenText(t.move_when as never)}</b></div>}
        </div>
      )}
      <div className="tp-q-price">
        <div>
          <span>סה״כ להובלה{best ? ' · המחיר הטוב ביותר' : ''}</span>
          <div className="tp-q-amount">{nis(o.price)}</div>
          <span>כולל מע״מ</span>
        </div>
        <div className="tp-q-date"><CalendarDays size={18} strokeWidth={1.75} /> {offerDate(o)}</div>
      </div>
      {o.note && <div className="tp-q-note"><b>הערות המוביל</b><p>{o.note}</p></div>}
      <div className="tp-q-contact">
        <div><span>איש קשר</span><b>{o.contact || name}</b></div>
        <div><span>טלפון</span><a href={`tel:${o.phone}`} dir="ltr">{phoneDisplay(o.phone)}</a></div>
      </div>
      <div className="tp-q-actions">
        <a className="lp-btn" href={waLink(o.phone, toMover)} target="_blank" rel="noreferrer"><MessageCircle size={20} strokeWidth={2} /> וואטסאפ למוביל</a>
        <a className="tp-btn2" href={`tel:${o.phone}`}><Phone size={18} strokeWidth={2} /> התקשרות</a>
      </div>
      {!compact && <p className="tp-q-terms">המחיר נמסר על ידי המוביל על סמך הפרטים והסרטון שצירפת. שינוי בהיקף ההובלה עשוי לשנות את המחיר. ההתקשרות והתשלום הם ישירות מול המוביל.</p>}
    </article>
  );
}
