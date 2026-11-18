import { Award, ShieldCheck, Star, Timer } from 'lucide-react';
import type { Funnel } from '@/lib/handoff';
import type { Theme } from '../CallbackForm';
import { LeadCard } from './LeadCard';
import { Logo, Swoosh } from './Logo';
import '../../app/landing.css';
import { LEGAL } from '@/lib/legal';
import type { Entry } from '@/lib/client';
import { QaBanner } from '../QaBanner';

const HOW = [
  ['2 דקות של פרטים', 'מספרים לנו מאיפה, לאן ומתי עוברים. חינם ובלי התחייבות.'],
  ['מקבלים כמה הצעות מחיר', 'מובילים מדורגים מגישים לכם הצעות, ועל כל הצעה חדשה תקבלו הודעה.'],
  ['משווים ובוחרים', 'כל ההצעות מחכות לכם בדף אחד. בוחרים את המוביל שמתאים לכם ופונים אליו.'],
];
const WHY = [
  ['כל המובילים מדורגים', 'כל מוביל אצלנו מדורג על ידי לקוחות אמיתיים שעברו איתו.'],
  ['כמה הצעות, השוואה אחת', 'במקום להתקשר לחברות אחת אחת, ההצעות מגיעות אליכם.'],
  ['בלי עלות ובלי התחייבות', 'אתם מחליטים אם ועם מי להתקדם.'],
];

function Below() {
  return (
    <>
      <section className="lp-sec" id="how">
        <div className="lp-wrap">
          <h2>איך זה עובד</h2>
          <ol className="lp-steps">
            {HOW.map(([t, b], i) => <li key={t}><span className="lp-num">{i + 1}</span><h3>{t}</h3><p>{b}</p></li>)}
          </ol>
        </div>
      </section>
      <section className="lp-sec lp-sec-alt" id="why">
        <div className="lp-wrap">
          <h2>למה רק מובילים מדורגים</h2>
          <ul className="lp-steps">
            {WHY.map(([t, b]) => <li key={t}><ShieldCheck className="lp-why-ico" size={28} strokeWidth={1.5} aria-hidden /><h3>{t}</h3><p>{b}</p></li>)}
          </ul>
          <a href="#top" className="lp-btn lp-btn-inline">קבלו 5 הצעות בחינם</a>
        </div>
      </section>
      <footer className="lp-foot">
        <div className="lp-wrap">
          <span>© {new Date().getFullYear()} MoveMatch · {LEGAL.entityShort}, ח.פ. {LEGAL.companyId}</span>
          <span>השירות ללא עלות ללקוח. הפרטים שלכם מועברים רק למובילים לצורך הצעת מחיר, ועדכונים על המכרז וההצעות יישלחו אליכם ב-SMS ובוואטסאפ. </span>
          <span className="foot-links"><a href="/privacy">מדיניות פרטיות</a><a href="/terms">תנאי שימוש</a><a href="/accessibility">הצהרת נגישות</a><a href="/our-movers">המובילים שלנו</a><a href="/movers/join">למובילים: הצטרפות</a></span>
        </div>
      </footer>
    </>
  );
}

function ArtLanding({ funnel, entry }: { funnel: Funnel; entry: Entry }) {
  return (
    <div className="lp lp-art" id="top">
      <section className="lp-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="art-leaves" src="/art-leaves.webp" alt="" width={320} height={280} aria-hidden />
        <div className="lp-wrap art-center">
          <Logo />
          <h1>משווים מחירי הובלה <span className="lp-hl">וחוסכים<Swoosh /></span></h1>
          <p className="lp-sub">ממלאים פרטים פעם אחת ומקבלים עד 5 הצעות מחיר ממובילים אמינים באזורכם</p>
          <LeadCard funnel={funnel} theme="art" entry={entry} />
        </div>
        <div className="art-scene" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="art-movers" src="/art-movers.webp" alt="" width={480} height={611} fetchPriority="high" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="art-building" src="/art-building.webp" alt="" width={477} height={621} />
        </div>
      </section>
      <Below />
    </div>
  );
}

function Points({ mobile = false }: { mobile?: boolean }) {
  return (
    <ul className={`ph-points ${mobile ? 'ph-mobile-points' : ''}`}>
      <li><Timer size={34} strokeWidth={1.3} aria-hidden /><span>תשובות<br />מהירות</span></li>
      <li><Award size={34} strokeWidth={1.3} aria-hidden /><span>מובילים<br />מדורגים</span></li>
    </ul>
  );
}

function PhotoLanding({ funnel, entry }: { funnel: Funnel; entry: Entry }) {
  return (
    <div className="lp lp-photo" id="top">
      <section className="lp-hero">
        <div className="ph-media">
          <picture>
            <source media="(min-width: 1180px)" srcSet="/hero-real-800.webp 836w, /hero-real-1600.webp 1672w" sizes="100vw" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hero-real-mobile.webp" width={392} height={628} alt="המובילים של MoveMatch מעמיסים את משאית ההובלה" fetchPriority="high" />
          </picture>
        </div>
        <div className="lp-wrap ph-top">
          <Logo />
        </div>
        <div className="lp-wrap ph-grid">
          <div className="ph-copy">
            <h1><span className="ph-br">משווים מחירי הובלה </span><span className="lp-hl">וחוסכים בגדול<Swoosh /></span></h1>
            <p className="lp-sub">קבלו עד 5 הצעות מחיר ממובילים אמינים ומדורגים, ללא עלות וללא התחייבות</p>
            <Points />
          </div>
          <div className="ph-card"><LeadCard funnel={funnel} theme="photo" entry={entry} /></div>
          <Points mobile />
        </div>
      </section>
      <div className="ph-proof">
        <div className="lp-wrap">
          <span className="ph-proof-item">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/movers-faces.webp" alt="" width={300} height={176} aria-hidden />
            מובילים אמיתיים, שעובדים איתנו באופן קבוע
          </span>
          <span className="ph-proof-sep" aria-hidden />
          <span className="ph-proof-item">
            <span className="ph-stars" aria-hidden>{[0, 1, 2, 3, 4].map((i) => <Star key={i} size={18} fill="currentColor" strokeWidth={0} />)}</span>
            כל המובילים מדורגים
          </span>
        </div>
      </div>
      <Below />
    </div>
  );
}

/**
 * entry: 'home' on the homepage (owner's test area: leads are not sent to movers, see lib/qa.ts),
 * 'qa' on the /qa test area (nothing is sent; a banner says so), nothing on the live funnels.
 */
export function ThemedLanding({ funnel, theme, entry = null }: { funnel: Funnel; theme: Theme; entry?: Entry }) {
  return (
    <main>
      {entry === 'qa' && <QaBanner always />}
      {theme === 'art' ? <ArtLanding funnel={funnel} entry={entry} /> : <PhotoLanding funnel={funnel} entry={entry} />}
    </main>
  );
}
