import { CallbackForm } from './CallbackForm';
import type { Funnel } from '@/lib/handoff';
import { TruckPhoto } from './TruckPhoto';
import { Footer, Header } from './ui';

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

export function CallbackLanding({ funnel = 'a' }: { funnel?: Funnel }) {
  return (
    <>
      <Header nav />
      <main>
        <section className="hero">
          <div className="photo-strip"><TruckPhoto strip /></div>
          <div className="wrap">
            <div className="hero-text">
              <div className="kicker">5 הצעות · חינם · בלי התחייבות</div>
              <h1>עוברים דירה? מעלים את כל פרטי ההובלה פעם אחת, מקבלים כמה הצעות מחיר ובוחרים את המחיר הטוב ביותר.</h1>
              <p className="hero-sub">משאירים שם, טלפון ועיר, ואנחנו חוזרים אליכם עם 5 הצעות מחברות הובלה מדורגות.</p>
              <CallbackForm funnel={funnel} />
            </div>
            <div className="hero-photo truck-hero"><TruckPhoto /></div>
          </div>
        </section>

        <section className="section" id="how">
          <div className="wrap">
            <h2>איך זה עובד</h2>
            <div className="cells">
              {HOW.map(([t, b], i) => (
                <div className="cell" key={t}><div className="num">0{i + 1}</div><h3>{t}</h3><p>{b}</p></div>
              ))}
            </div>
          </div>
        </section>

        <section className="section band" id="why">
          <div className="wrap">
            <h2>למה רק מובילים מדורגים</h2>
            <div className="cells">
              {WHY.map(([t, b]) => (<div className="cell" key={t}><h3>{t}</h3><p>{b}</p></div>))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
