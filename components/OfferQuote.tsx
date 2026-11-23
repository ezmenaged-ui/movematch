import { ArrowLeft, CalendarDays, MessageCircle, Phone, ShieldCheck } from 'lucide-react';
import { MoverLogo } from './MoverLogo';
import { MoverRatings } from './MoverRatings';
import { cityOf, nis, offerDate, offerName, phoneDisplay, Tender, TenderOffer, waLink } from '@/lib/tender';
import { whenText } from '@/lib/validate';
import { t, type Locale } from '@/lib/i18n';

const issued = (d: string, locale: Locale) => new Date(d).toLocaleDateString(t(locale).dateLocale, { timeZone: 'Asia/Jerusalem', day: 'numeric', month: 'long', year: 'numeric' });

/** One mover's offer laid out as an official quote: mover header, price, notes, contact and actions. */
export function OfferQuote({ t: tn, o, n, best, compact = false, locale = 'he' }: { t: Tender; o: TenderOffer; n: number; best: boolean; compact?: boolean; locale?: Locale }) {
  const q = t(locale).quote;
  const name = offerName(o, n, locale);
  const quoteNo = `${tn.tender_no}-${n}`;
  const from = cityOf(tn.move_from, tn.city, locale), to = cityOf(tn.move_to, null, locale);
  const toMover = q.toMover(quoteNo, nis(o.price), from || '', to || '');
  return (
    <article className={`tp-quote ${best ? 'best' : ''}`} id={`offer-${n}`}>
      <header className="tp-q-head">
        <MoverLogo id={o.mover_id} hasLogo={o.has_logo} name={name} size={compact ? 56 : 72} />
        <div className="tp-q-mover">
          <h2>{name}</h2>
          {o.mover_id ? <span className="tp-q-ok"><ShieldCheck size={15} strokeWidth={2} /> {q.approved}</span> : <span className="tp-q-sub">{q.participant}</span>}
          <MoverRatings o={o} locale={locale} />
        </div>
        <dl className="tp-q-meta">
          <dt>{q.offer}</dt><dd dir="ltr">{quoteNo}</dd>
          <dt>{q.date}</dt><dd>{issued(o.created_at, locale)}</dd>
        </dl>
      </header>
      {!compact && (
        <div className="tp-q-for">
          <div><span>{q.for}</span><b>{tn.name || q.client}</b></div>
          <div><span>{q.route}</span><b>{from || '—'} <ArrowLeft size={14} aria-label={t(locale).tender.to} /> {to || '—'}</b></div>
          {tn.move_when && <div><span>{q.when}</span><b>{whenText(tn.move_when as never, locale)}</b></div>}
        </div>
      )}
      <div className="tp-q-price">
        <div>
          <span>{q.total}{best ? q.bestSuffix : ''}</span>
          <div className="tp-q-amount">{nis(o.price)}</div>
          <span>{t(locale).tender.vat}</span>
        </div>
        <div className="tp-q-date"><CalendarDays size={18} strokeWidth={1.75} /> {offerDate(o, locale)}</div>
      </div>
      {o.note && <div className="tp-q-note"><b>{q.notes}</b><p>{o.note}</p></div>}
      <div className="tp-q-contact">
        <div><span>{q.contact}</span><b>{o.contact || name}</b></div>
        <div><span>{q.phone}</span><a href={`tel:${o.phone}`} dir="ltr">{phoneDisplay(o.phone)}</a></div>
      </div>
      <div className="tp-q-actions">
        <a className="lp-btn" href={waLink(o.phone, toMover)} target="_blank" rel="noreferrer"><MessageCircle size={20} strokeWidth={2} /> {q.whatsapp}</a>
        <a className="tp-btn2" href={`tel:${o.phone}`}><Phone size={18} strokeWidth={2} /> {q.call}</a>
      </div>
      {!compact && <p className="tp-q-terms">{q.terms}</p>}
    </article>
  );
}
