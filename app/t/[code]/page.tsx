import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CalendarDays, ChevronLeft, Layers, ShieldCheck, Video } from 'lucide-react';
import { AutoRefresh } from '@/components/AutoRefresh';
import { Countdown } from '@/components/Countdown';
import { MoverLogo } from '@/components/MoverLogo';
import { WalkingMover } from '@/components/WalkingMover';
import { MoverRatings } from '@/components/MoverRatings';
import { TenderShell } from '@/components/TenderShell';
import { cityOf, getTender, nis, offerDate, offerName } from '@/lib/tender';
import { whenText } from '@/lib/validate';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'המכרז שלך · MoveMatch', robots: { index: false, follow: false } };

/** Client tender page: the link in the "tender opened" message. Offers are the centrepiece; each opens on its own. */
export default async function TenderPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const t = await getTender(code);
  if (!t) notFound();

  const from = cityOf(t.move_from, t.city), to = cityOf(t.move_to);
  const canResume = !!t.resume && t.variant !== 'a';
  const detailsDone = t.status === 'complete' && t.variant !== 'a';
  const offers = t.offers.map((o, i) => ({ ...o, n: i + 1 })).sort((a, b) => a.price - b.price);
  const best = offers[0]?.price;

  return (
    <TenderShell tenderNo={t.tender_no} hero={
      <>
        {t.closes_at
          ? <Countdown closesAt={t.closes_at} serverNow={t.now} />
          : <span className="tp-pill">{t.variant === 'a' ? 'נציג יחזור אליך בקרוב' : 'המכרז ייפתח למובילים אחרי השלמת הפרטים'}</span>}
        <h1>{t.name ? `${t.name}, ` : ''}ההצעות להובלה שלך</h1>
        <div className="tz-chips">
          <span><b>{from || '—'}</b> <ArrowLeft size={16} aria-label="אל" /> <b>{to || '—'}</b></span>
          {t.move_when && <span><CalendarDays size={15} strokeWidth={1.75} /> {whenText(t.move_when as never)}</span>}
        </div>
      </>
    }>
      <section className="tp-board" aria-labelledby="offers-h">
        {offers.length > 0 && <div className="tp-board-head">
          <div>
            <h2 id="offers-h">{offers.length ? <><span className="tp-count">{offers.length}</span> {offers.length === 1 ? 'הצעת מחיר התקבלה' : 'הצעות מחיר התקבלו'}</> : 'ההצעות בדרך אליך'}</h2>
            <AutoRefresh count={offers.length} />
          </div>
          {offers.length > 1 && (
            <Link href={`/t/${code}/all`} className="lp-btn tp-all"><Layers size={20} strokeWidth={2} /> צפייה בכל ההצעות</Link>
          )}
        </div>}

        {canResume && (
          <div className="tp-resume">
            <div><b>נשאר צעד אחד כדי לקבל הצעות מדויקות</b><span>השלמת הכתובות, התאריך וסרטון קצר עוזרת למובילים לתת מחיר סופי.</span></div>
            <Link href={`/t/${code}/continue`} className="lp-btn">השלמת פרטים <ChevronLeft size={20} /></Link>
          </div>
        )}

        {t.upload && (
          <div className="tp-resume tp-video">
            <div>
              <b>{t.videos > 0 ? `יש ${t.videos === 1 ? 'סרטון אחד' : `${t.videos} סרטונים`} במכרז. רוצים להוסיף עוד?` : 'הוסיפו סרטון קצר של הדירה'}</b>
              <span>סרטון של החדרים עוזר למובילים לתת מחיר מדויק יותר. הוא יתווסף למכרז ויוצג למובילים.</span>
            </div>
            <Link href={`/u/${t.upload.id}?k=${t.upload.token}&t=${code}`} className="lp-btn"><Video size={20} strokeWidth={2} /> הוספת סרטון</Link>
          </div>
        )}

        {offers.length === 0 ? (
          <div className="tz-wait">
            <WalkingMover />
            <div className="tz-bubble">
              <b>אנחנו עובדים על זה במרץ 💪</b>
              <p>זה עשוי לקחת קצת זמן, אז אין צורך לחכות כאן. ברגע שיגיעו הצעות, נשלח לך הודעה.</p>
            </div>
            <AutoRefresh count={0} />
          </div>
        ) : (
          <ol className="tp-list">
            {offers.map((o) => (
              <li key={o.id}>
                <Link href={`/t/${code}/${o.n}`} className={`tp-offer ${o.price === best && offers.length > 1 ? 'best' : ''}`}>
                  {o.price === best && offers.length > 1 && <span className="tp-best">המחיר הטוב ביותר</span>}
                  <MoverLogo id={o.mover_id} hasLogo={o.has_logo} name={offerName(o, o.n)} size={60} />
                  <div className="tp-offer-main">
                    <div className="tp-offer-name">{offerName(o, o.n)}{o.mover_id && <ShieldCheck size={17} strokeWidth={2} className="tp-ok" aria-label="מוביל מאושר" />}</div>
                    <MoverRatings o={o} compact />
                    <div className="tp-offer-meta">{offerDate(o)}</div>
                  </div>
                  <div className="tp-offer-side">
                    <div className="tp-price">{nis(o.price)}</div>
                    <span className="tp-vat">כולל מע״מ</span>
                    <span className="tp-go">לפרטי ההצעה <ChevronLeft size={16} /></span>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      <ul className="tz-trust">
        <li><ShieldCheck size={16} strokeWidth={2} /> כל המובילים מדורגים</li>
        <li><ShieldCheck size={16} strokeWidth={2} /> ללא עלות וללא התחייבות</li>
      </ul>
    </TenderShell>
  );
}
