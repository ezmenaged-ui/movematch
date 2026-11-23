import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CircleCheck } from 'lucide-react';
import { MoverLogo } from '@/components/MoverLogo';
import { MoverRatings } from '@/components/MoverRatings';
import { paragraphs, peopleLine, publicMover, publicMovers, safeUrl } from '@/lib/publicMovers';
import { OurMoversShell } from '../Shell';
import { RevealPhone } from '../RevealPhone';

export const revalidate = 300;

function Compare({ slug, className }: { slug: string; className: string }) {
  return (
    <div className={`om-cta ${className}`}>
      <h2>להשוות לפני שמחליטים?</h2>
      <p>מעלים את פרטי ההובלה פעם אחת ומקבלים עד 5 הצעות ממובילים מדורגים באזור שלכם. חינם ובלי התחייבות.</p>
      <a className="om-btn" href={`/?utm_source=our_movers&utm_medium=profile&utm_campaign=${slug}`}>קבלו הצעות מחיר</a>
    </div>
  );
}

export async function generateStaticParams() {
  return (await publicMovers()).map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const m = await publicMover((await params).slug);
  if (!m) return { title: 'מוביל לא נמצא · MoveMatch', robots: { index: false } };
  const desc = m.profile.tagline || paragraphs(m.profile.about)[0] || `${m.company_name}: פרופיל, דירוגים ומה הלקוחות אומרים.`;
  return {
    title: `${m.company_name} · המובילים של MoveMatch`,
    description: desc.slice(0, 160),
    alternates: { canonical: `/our-movers/${m.slug}` },
    openGraph: { title: m.company_name, description: desc.slice(0, 160), locale: 'he_IL', type: 'profile' },
  };
}

export default async function MoverProfile({ params }: { params: Promise<{ slug: string }> }) {
  const m = await publicMover((await params).slug);
  if (!m) notFound();
  const p = m.profile;
  const facts = (p.facts || []).filter((f) => f?.label && f?.value);
  const links = [
    ['האתר שלהם', safeUrl(p.website)],
    ['פייסבוק', safeUrl(p.facebook) || safeUrl(m.facebook_url)],
    ['אינסטגרם', safeUrl(p.instagram)],
  ].filter(([, u]) => u) as [string, string][];
  const firstName = (p.people || m.name || '').split(/[\s,]+/)[0];
  const quotes = (p.testimonials || []).filter((t) => t?.text && t?.name);

  return (
    <OurMoversShell back={{ href: '/our-movers', label: '← כל המובילים' }}>
      <section className="om-hero">
        <div className="lp-wrap">
          <div className="om-profile-head">
            <MoverLogo id={m.id} hasLogo={m.has_logo} name={m.company_name} size={96} />
            <div>
              <p className="om-kicker">מוביל ב-MoveMatch</p>
              <h1>{m.company_name}</h1>
              {peopleLine(m) && <p className="om-who">{peopleLine(m)}</p>}
            </div>
          </div>
          {p.tagline && <p className="om-tagline" style={{ marginTop: 14, fontSize: 18 }}>{p.tagline}</p>}
          <MoverRatings o={m} extra={p.extra_ratings} />
          {p.intro && <p className="om-intro">{p.intro}</p>}
        </div>
      </section>

      <div className="lp-wrap om-layout">
        <main className="om-main">
          {(facts.length > 0 || m.areas.length > 0) && (
            <section className="om-box" aria-labelledby="facts">
              <h2 id="facts">בקצרה</h2>
              <dl className="om-facts">
                {facts.map((f) => <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}
                {m.areas.length > 0 && <div><dt>אזורי שירות</dt><dd>{m.areas.join(' · ')}</dd></div>}
              </dl>
            </section>
          )}

          {paragraphs(p.about).length > 0 && (
            <section className="om-box" aria-labelledby="about">
              <h2 id="about">עליהם</h2>
              {paragraphs(p.about).map((t, i) => <p key={i}>{t}</p>)}
            </section>
          )}

          {(p.promises || []).length > 0 && (
            <section className="om-box" aria-labelledby="promises">
              <h2 id="promises">על מה אפשר לסמוך</h2>
              <ul className="om-promises">{p.promises!.filter((x) => x?.title).map((x) => <li key={x.title}><b>{x.title}</b><span>{x.text}</span></li>)}</ul>
            </section>
          )}

          {(p.services || []).length > 0 && (
            <section className="om-box" aria-labelledby="services">
              <h2 id="services">שירותים</h2>
              <ul className="om-services">{p.services!.map((s) => <li key={s}><CircleCheck size={18} aria-hidden />{s}</li>)}</ul>
            </section>
          )}

          {quotes.length > 0 && (
            <section className="om-box" aria-labelledby="quotes">
              <h2 id="quotes">מה הלקוחות אומרים</h2>
              <ul className="om-quotes">
                {quotes.map((t, i) => (
                  <li key={i}>
                    <figure style={{ margin: 0 }}>
                      <blockquote>״{t.text}״</blockquote>
                      <figcaption><b>{t.name}</b>{t.place ? `, ${t.place}` : ''}{t.source ? ` · ${t.source}` : ''}</figcaption>
                    </figure>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {links.length > 0 && (
            <div className="om-links">{links.map(([l, u]) => <a key={l} href={u} target="_blank" rel="noreferrer nofollow">{l} ↗</a>)}</div>
          )}
          <Compare slug={m.slug} className="om-mob" />
        </main>

        <aside className="om-side">
          <div className="om-box om-contact">
            <h2>לדבר עם {firstName || m.company_name}</h2>
            <p>רוצים לפנות ישירות? השאירו שם ונייד, ונציג לכם את המספר.</p>
            <RevealPhone slug={m.slug} company={m.company_name} firstName={firstName} />
          </div>
          <Compare slug={m.slug} className="om-desk" />
        </aside>
      </div>

      <div className="lp-wrap om-bottom">
        <p className="om-note">המידע בעמוד נלקח מהאתר של {m.company_name}, מהפרטים שמסרו לנו ומאתרי ביקורות ציבוריים. הדירוגים מתעדכנים מעת לעת. MoveMatch אינה צד להסכם בינכם לבין המוביל.</p>
      </div>
    </OurMoversShell>
  );
}
