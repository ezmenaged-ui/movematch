import type { Metadata } from 'next';
import { MoverLogo } from '@/components/MoverLogo';
import { MoverRatings } from '@/components/MoverRatings';
import { peopleLine, publicMovers } from '@/lib/publicMovers';
import { OurMoversShell } from './Shell';

export const revalidate = 300;
export const metadata: Metadata = {
  title: 'המובילים שלנו · MoveMatch',
  description: 'חברות ההובלה שמגישות הצעות מחיר ב-MoveMatch: מי הם, כמה ניסיון יש להם, מה הלקוחות אומרים עליהם והדירוגים שלהם בגוגל, במדרג ובפייסבוק.',
  alternates: { canonical: '/our-movers' },
};

export default async function OurMovers() {
  const movers = await publicMovers();
  return (
    <OurMoversShell>
      <section className="om-hero">
        <div className="lp-wrap">
          <h1>המובילים שלנו</h1>
          <p>אלה חברות ההובלה שמגישות הצעות מחיר דרך MoveMatch. כל אחת מדורגת על ידי לקוחות אמיתיים, ולכל אחת יש אנשים מאחוריה. הכירו אותם.</p>
        </div>
      </section>
      <main className="lp-wrap om-bottom">
        {movers.length === 0 ? <p className="om-note">הרשימה מתעדכנת. נסו שוב בעוד כמה דקות.</p> : (
          <ul className="om-grid">
            {movers.map((m) => {
              const p = m.profile;
              const who = peopleLine(m);
              const chips = [p.years ? `${p.years}+ שנות ניסיון` : '', ...m.areas.slice(0, 3)].filter(Boolean);
              return (
                <li key={m.id} className="om-card">
                  <div className="om-card-head">
                    <MoverLogo id={m.id} hasLogo={m.has_logo} name={m.company_name} size={60} />
                    <div>
                      <h2><a href={`/our-movers/${m.slug}`}>{m.company_name}</a></h2>
                      {who && <p className="om-who">{who}</p>}
                    </div>
                  </div>
                  {p.tagline && <p className="om-tagline">{p.tagline}</p>}
                  <MoverRatings o={m} compact extra={p.extra_ratings} />
                  {chips.length > 0 && <ul className="om-chips">{chips.map((c) => <li key={c}>{c}</li>)}</ul>}
                  <span className="om-card-more" aria-hidden>לפרופיל המלא ←</span>
                </li>
              );
            })}
          </ul>
        )}
        <div className="om-cta" style={{ marginTop: 28 }}>
          <h2>רוצים כמה הצעות מחיר בבת אחת?</h2>
          <p>מעלים את פרטי ההובלה פעם אחת, והמובילים שמשרתים את האזור שלכם שולחים הצעות. חינם ובלי התחייבות.</p>
          <a className="om-btn" href="/?utm_source=our_movers&utm_medium=directory">קבלו הצעות מחיר</a>
        </div>
        <p className="om-note">הדירוגים נלקחו מ-Google, ממדרג, מפייסבוק ומאתרי ביקורות נוספים, ומתעדכנים מעת לעת. מספר הביקורות ליד כל דירוג.</p>
      </main>
    </OurMoversShell>
  );
}
