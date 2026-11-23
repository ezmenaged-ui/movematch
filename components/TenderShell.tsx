import { Logo } from './themed/Logo';
import '../app/landing.css';
import '../app/tender.css';
import { LEGAL } from '@/lib/legal';
import { lp, t, type Locale } from '@/lib/i18n';
import { FootLinks } from './themed/FootLinks';

/** Shared frame for the client tender pages: calm, airy, a soft illustration of the new home instead of a busy photo. */
export function TenderShell({ tenderNo, children, hero, locale = 'he' }: { tenderNo: number; children: React.ReactNode; hero?: React.ReactNode; locale?: Locale }) {
  const d = t(locale);
  return (
    <div className="lp tp tz">
      <header className="lp-wrap tz-top">
        <Logo href={lp(locale, '/')} />
        <span className="tp-no">{d.tender.no} <b dir="ltr">{tenderNo}</b></span>
      </header>
      {hero && (
        <section className="lp-wrap">
          <div className="tz-hero">
            <div className="tz-hero-text">{hero}</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="tz-art" src="/art-building.webp" alt="" width={477} height={621} aria-hidden />
          </div>
        </section>
      )}
      <main className="lp-wrap tp-main">{children}</main>
      <footer className="tp-foot">
        <div className="lp-wrap">
          <span>© {new Date().getFullYear()} MoveMatch · {locale === 'en' ? LEGAL.entityShortEn : LEGAL.entityShort}, {d.footer.companyId} {LEGAL.companyId} · {d.footer.free}</span>
          <FootLinks locale={locale} />
        </div>
      </footer>
    </div>
  );
}
