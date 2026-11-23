import { Logo } from '@/components/themed/Logo';
import { LEGAL } from '@/lib/legal';
import '../../landing.css';
import './our-movers.css';

/** Frame for the public mover pages: brand header, a quiet way back to the funnel, the standard footer. */
export function OurMoversShell({ children, back }: { children: React.ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="lp om">
      <header className="lp-wrap om-top">
        <Logo />
        <a className="om-top-link" href={back?.href || '/'}>{back?.label || 'קבלו הצעות מחיר בחינם'}</a>
      </header>
      {children}
      <footer className="lp-foot">
        <div className="lp-wrap">
          <span>© {new Date().getFullYear()} MoveMatch · {LEGAL.entityShort}, ח.פ. {LEGAL.companyId}</span>
          <span>MoveMatch אינה חברת הובלה. המובילים הם עסקים עצמאיים, והפרטים על כל מוביל נלקחו מהאתר שלו, מהפרטים שמסר לנו ומאתרי ביקורות ציבוריים.</span>
          <span className="foot-links"><a href="/privacy">מדיניות פרטיות</a><a href="/terms">תנאי שימוש</a><a href="/accessibility">הצהרת נגישות</a><a href="/movers/join">למובילים: הצטרפות</a></span>
        </div>
      </footer>
    </div>
  );
}
