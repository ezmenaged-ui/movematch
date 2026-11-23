import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Layers, ShieldCheck, Video } from 'lucide-react';
import { AutoRefresh } from '@/components/AutoRefresh';
import { Countdown } from '@/components/Countdown';
import { MoverLogo } from '@/components/MoverLogo';
import { WalkingMover } from '@/components/WalkingMover';
import { MoverRatings } from '@/components/MoverRatings';
import { TenderShell } from '@/components/TenderShell';
import { OfferQuote } from '@/components/OfferQuote';
import { ResumeLead } from '@/components/ResumeLead';
import { cityOf, getTender, nis, offerDate, offerName, type Tender } from '@/lib/tender';
import { whenText } from '@/lib/validate';
import { lp, t as dict, type Locale } from '@/lib/i18n';

/**
 * The client's tender pages, in Hebrew (/t/<code>) and English (/en/t/<code>). The link in our messages is always /t/<code>;
 * a tender opened from the English site (lang 'en') forwards to the English page. The English pages never forward back.
 */
async function load(code: string, locale: Locale, sub = ''): Promise<Tender> {
  const t = await getTender(code);
  if (!t) notFound();
  if (locale === 'he' && t.lang === 'en') redirect(`/en/t/${code}${sub}`);
  return t;
}

/** The tender page: the link in the "tender opened" message. Offers are the centrepiece; each opens on its own. */
export async function TenderView({ code, locale }: { code: string; locale: Locale }) {
  const t = await load(code, locale);
  const d = dict(locale).tender;
  const L = (p: string) => lp(locale, p);
  const from = cityOf(t.move_from, t.city, locale), to = cityOf(t.move_to, null, locale);
  const canResume = !!t.resume && t.variant !== 'a';
  const offers = t.offers.map((o, i) => ({ ...o, n: i + 1 })).sort((a, b) => a.price - b.price);
  const best = offers[0]?.price;

  return (
    <TenderShell tenderNo={t.tender_no} locale={locale} hero={
      <>
        {t.closes_at
          ? <Countdown closesAt={t.closes_at} serverNow={t.now} />
          : <span className="tp-pill">{t.variant === 'a' ? d.callback : d.opensAfter}</span>}
        <h1>{d.title(t.name || '')}</h1>
        <div className="tz-chips">
          <span><b>{from || '—'}</b> <ArrowLeft size={16} aria-label={d.to} /> <b>{to || '—'}</b></span>
          {t.move_when && <span><CalendarDays size={15} strokeWidth={1.75} /> {whenText(t.move_when as never, locale)}</span>}
        </div>
      </>
    }>
      <section className="tp-board" aria-labelledby="offers-h">
        {offers.length > 0 && <div className="tp-board-head">
          <div>
            <h2 id="offers-h">{offers.length ? <><span className="tp-count">{offers.length}</span> {d.received(offers.length)}</> : d.onTheWay}</h2>
            <AutoRefresh count={offers.length} />
          </div>
          {offers.length > 1 && (
            <Link href={L(`/t/${code}/all`)} className="lp-btn tp-all"><Layers size={20} strokeWidth={2} /> {d.viewAll}</Link>
          )}
        </div>}

        {canResume && (
          <div className="tp-resume">
            <div><b>{d.resumeTitle}</b><span>{d.resumeBody}</span></div>
            <Link href={L(`/t/${code}/continue`)} className="lp-btn">{d.resumeBtn} <ChevronLeft size={20} /></Link>
          </div>
        )}

        {t.upload && (
          <div className="tp-resume tp-video">
            <div>
              <b>{t.videos > 0 ? d.videoHas(t.videos) : d.videoAdd}</b>
              <span>{d.videoWhy}</span>
            </div>
            <Link href={`${L(`/u/${t.upload.id}`)}?k=${t.upload.token}&t=${code}`} className="lp-btn"><Video size={20} strokeWidth={2} /> {d.videoBtn}</Link>
          </div>
        )}

        {offers.length === 0 ? (
          <div className="tz-wait">
            <WalkingMover />
            <div className="tz-bubble">
              <b>{d.waitTitle}</b>
              <p>{d.waitBody}</p>
            </div>
            <AutoRefresh count={0} />
          </div>
        ) : (
          <ol className="tp-list">
            {offers.map((o) => (
              <li key={o.id}>
                <Link href={L(`/t/${code}/${o.n}`)} className={`tp-offer ${o.price === best && offers.length > 1 ? 'best' : ''}`}>
                  {o.price === best && offers.length > 1 && <span className="tp-best">{d.best}</span>}
                  <MoverLogo id={o.mover_id} hasLogo={o.has_logo} name={offerName(o, o.n, locale)} size={60} />
                  <div className="tp-offer-main">
                    <div className="tp-offer-name">{offerName(o, o.n, locale)}{o.mover_id && <ShieldCheck size={17} strokeWidth={2} className="tp-ok" aria-label={d.approved} />}</div>
                    <MoverRatings o={o} compact locale={locale} />
                    <div className="tp-offer-meta">{offerDate(o, locale)}</div>
                  </div>
                  <div className="tp-offer-side">
                    <div className="tp-price">{nis(o.price)}</div>
                    <span className="tp-vat">{d.vat}</span>
                    <span className="tp-go">{d.details} <ChevronLeft size={16} /></span>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      <ul className="tz-trust">
        <li><ShieldCheck size={16} strokeWidth={2} /> {d.trustRated}</li>
        <li><ShieldCheck size={16} strokeWidth={2} /> {d.trustFree}</li>
      </ul>
    </TenderShell>
  );
}

/** One mover's offer as an official quote. */
export async function OfferView({ code, n: nStr, locale }: { code: string; n: string; locale: Locale }) {
  const n = Number(nStr);
  const t = await load(code, locale, `/${nStr}`);
  const o = Number.isInteger(n) && n >= 1 ? t.offers[n - 1] : null;
  if (!o) notFound();
  const d = dict(locale).tender;
  const L = (p: string) => lp(locale, p);
  const best = t.offers.length > 1 && o.price === Math.min(...t.offers.map((x) => x.price));
  const op = process.env.OPERATOR_WHATSAPP;

  return (
    <TenderShell tenderNo={t.tender_no} locale={locale}>
      <nav className="tp-crumbs">
        <Link href={L(`/t/${code}`)}><ChevronRight size={16} /> {d.allInTender}</Link>
        {t.offers.length > 1 && <Link href={L(`/t/${code}/all`)}><Layers size={15} /> {d.compareAll}</Link>}
      </nav>
      <OfferQuote t={t} o={o} n={n} best={best} locale={locale} />
      {t.offers.length > 1 && (
        <nav className="tp-others" aria-label={d.others}>
          <span>{d.othersLabel}</span>
          {t.offers.map((x, i) => i + 1 !== n && <Link key={x.id} href={L(`/t/${code}/${i + 1}`)}>{offerName(x, i + 1, locale)} · {nis(x.price)}</Link>)}
        </nav>
      )}
      {op && <p className="tp-help">{d.question} <a href={`https://wa.me/${op}?text=${encodeURIComponent(d.askText(t.tender_no))}`} target="_blank" rel="noreferrer">{d.askUs}</a></p>}
    </TenderShell>
  );
}

/** Every offer in the tender, opened in full one under the other (cheapest first). */
export async function AllOffersView({ code, locale }: { code: string; locale: Locale }) {
  const t = await load(code, locale, '/all');
  const d = dict(locale).tender;
  const offers = t.offers.map((o, i) => ({ o, n: i + 1 })).sort((a, b) => a.o.price - b.o.price);
  const best = offers[0]?.o.price;
  return (
    <TenderShell tenderNo={t.tender_no} locale={locale}>
      <nav className="tp-crumbs"><Link href={lp(locale, `/t/${code}`)}><ChevronRight size={16} /> {d.backToTender}</Link></nav>
      <h1 className="tp-all-h">{d.allTitle(offers.length)}</h1>
      <div className="tp-all-list">
        {offers.map(({ o, n }) => <OfferQuote key={o.id} t={t} o={o} n={n} best={offers.length > 1 && o.price === best} compact locale={locale} />)}
      </div>
    </TenderShell>
  );
}

/** From the tender page back into the funnel, on any device: hands the lead to the wizard/form. */
export async function ContinueView({ code, locale }: { code: string; locale: Locale }) {
  const t = await getTender(code);
  if (!t || !t.resume || t.variant === 'a') redirect(lp(locale, `/t/${code}`));
  if (locale === 'he' && t.lang === 'en') redirect(`/en/t/${code}/continue`);
  // English: only D and E have English steps; anything else continues in English as E (same questions).
  const funnel = t.variant === 'wizard' ? 'b' : t.variant === 'items' ? 'd' : t.variant === 'choice' || t.variant === 'chat' ? 'e' : 'c';
  return <ResumeLead funnel={locale === 'en' && funnel !== 'd' ? 'e' : funnel} lead={t.resume} />;
}
