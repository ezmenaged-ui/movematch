import { Logo } from './themed/Logo';
import '../app/landing.css';
import '../app/tender.css';
import { LEGAL } from '@/lib/legal';

/** Shared frame for the client tender pages: calm, airy, a soft illustration of the new home instead of a busy photo. */
export function TenderShell({ tenderNo, children, hero }: { tenderNo: number; children: React.ReactNode; hero?: React.ReactNode }) {
  return (
    <div className="lp tp tz">
      <header className="lp-wrap tz-top">
        <Logo />
        <span className="tp-no">מכרז <b dir="ltr">{tenderNo}</b></span>
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
          <span>© {new Date().getFullYear()} MoveMatch · {LEGAL.entityShort}, ח.פ. {LEGAL.companyId} · השירות ללא עלות ללקוח</span>
          <span className="foot-links"><a href="/privacy">מדיניות פרטיות</a><a href="/terms">תנאי שימוש</a><a href="/accessibility">הצהרת נגישות</a><a href="/our-movers">המובילים שלנו</a></span>
        </div>
      </footer>
    </div>
  );
}
