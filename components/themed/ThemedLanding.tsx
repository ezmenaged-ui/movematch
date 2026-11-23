import { Award, Globe, ShieldCheck, Star, Timer } from 'lucide-react';
import type { Funnel } from '@/lib/handoff';
import type { Theme } from '../CallbackForm';
import { LeadCard } from './LeadCard';
import { Logo, Swoosh } from './Logo';
import { HlTitle } from './HlTitle';
import '../../app/landing.css';
import { LEGAL } from '@/lib/legal';
import type { Entry } from '@/lib/client';
import { QaBanner } from '../QaBanner';
import { DEFAULT_LOCALE, lp, t, type Locale } from '@/lib/i18n';
import { WhatsAppFloat } from './WhatsAppFloat';
import { FootLinks } from './FootLinks';

function Below({ locale }: { locale: Locale }) {
  const d = t(locale);
  return (
    <>
      <section className="lp-sec" id="how">
        <div className="lp-wrap">
          <h2>{d.how.title}</h2>
          <ol className="lp-steps">
            {d.how.steps.map(([h, b], i) => <li key={h}><span className="lp-num">{i + 1}</span><h3>{h}</h3><p>{b}</p></li>)}
          </ol>
        </div>
      </section>
      <section className="lp-sec lp-sec-alt" id="why">
        <div className="lp-wrap">
          <h2>{d.why.title}</h2>
          <ul className="lp-steps">
            {d.why.items.map(([h, b]) => <li key={h}><ShieldCheck className="lp-why-ico" size={28} strokeWidth={1.5} aria-hidden /><h3>{h}</h3><p>{b}</p></li>)}
          </ul>
          <a href="#top" className="lp-btn lp-btn-inline">{d.why.cta}</a>
        </div>
      </section>
      <footer className="lp-foot">
        <div className="lp-wrap">
          <span>© {new Date().getFullYear()} <span translate="no">MoveMatch</span> · {locale === 'en' ? LEGAL.entityShortEn : LEGAL.entityShort}, {d.footer.companyId} {LEGAL.companyId}</span>
          <span>{d.footer.note}</span>
          <FootLinks locale={locale} />
        </div>
      </footer>
    </>
  );
}

/**
 * The same page in the other language, for the language switch. English exists for the homepage, D and E (photo design)
 * and /f; the other Hebrew funnels (A, B, C and the art designs of D and E) switch to the English homepage.
 */
export function altPath(locale: Locale, funnel: Funnel, entry: Entry, whatsapp: boolean) {
  const page = entry === 'home' ? '/' : whatsapp ? '/f' : funnel === 'd' || funnel === 'e' ? `/${funnel}/photo` : '/';
  return locale === 'en' ? page : lp('en', page);
}

/** Link to the other language, at the top of the landing page. */
function LangSwitch({ href, locale }: { href: string; locale: Locale }) {
  const l = t(locale).lang;
  return <a className="lp-lang" href={href} hrefLang={l.switchLang} lang={l.switchLang} aria-label={l.switchAria}><Globe size={16} strokeWidth={1.75} aria-hidden /> {l.switchLabel}</a>;
}

type P = { funnel: Funnel; entry: Entry; whatsapp: boolean; locale: Locale; alt: string | null };

function ArtLanding({ funnel, entry, whatsapp, locale, alt }: P) {
  const d = t(locale);
  return (
    <div className={`lp lp-art${whatsapp ? ' lp-has-wa' : ''}`} id="top">
      <section className="lp-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="art-leaves" src="/art-leaves.webp" alt="" width={320} height={280} aria-hidden />
        {alt && <LangSwitch href={alt} locale={locale} />}
        <div className="lp-wrap art-center">
          <Logo href={lp(locale, '/')} />
          <h1><HlTitle parts={d.hero.art} /></h1>
          <p className="lp-sub">{d.hero.subArt}</p>
          <LeadCard funnel={funnel} theme="art" entry={entry} whatsapp={whatsapp} locale={locale} />
        </div>
        <div className="art-scene" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="art-movers" src="/art-movers.webp" alt="" width={480} height={611} fetchPriority="high" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="art-building" src="/art-building.webp" alt="" width={477} height={621} />
        </div>
      </section>
      <Below locale={locale} />
    </div>
  );
}

function Points({ mobile = false, locale }: { mobile?: boolean; locale: Locale }) {
  const d = t(locale);
  return (
    <ul className={`ph-points ${mobile ? 'ph-mobile-points' : ''}`}>
      <li><Timer size={34} strokeWidth={1.3} aria-hidden /><span>{d.hero.pointFast[0]}<br />{d.hero.pointFast[1]}</span></li>
      <li><Award size={34} strokeWidth={1.3} aria-hidden /><span>{d.hero.pointRated[0]}<br />{d.hero.pointRated[1]}</span></li>
    </ul>
  );
}

function PhotoLanding({ funnel, entry, whatsapp, locale, alt }: P) {
  const d = t(locale);
  const h = d.hero.photo;
  return (
    <div className={`lp lp-photo${whatsapp ? ' lp-has-wa' : ''}`} id="top">
      <section className="lp-hero">
        <div className="ph-media">
          <picture>
            <source media="(min-width: 1180px)" srcSet="/hero-real-800.webp 836w, /hero-real-1600.webp 1672w" sizes="100vw" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hero-real-mobile.webp" width={392} height={628} alt={d.hero.heroAlt} fetchPriority="high" />
          </picture>
        </div>
        <div className="lp-wrap ph-top">
          <Logo href={lp(locale, '/')} />
          {alt && <LangSwitch href={alt} locale={locale} />}
        </div>
        <div className="lp-wrap ph-grid">
          <div className="ph-copy">
            <h1><span className="ph-br">{h.before}</span><span className="lp-hl">{h.hl}<Swoosh /></span>{h.after && <span>{h.after}</span>}</h1>
            <p className="lp-sub">{d.hero.subPhoto}</p>
            <Points locale={locale} />
          </div>
          <div className="ph-card"><LeadCard funnel={funnel} theme="photo" entry={entry} whatsapp={whatsapp} locale={locale} /></div>
          <Points mobile locale={locale} />
        </div>
      </section>
      <div className="ph-proof">
        <div className="lp-wrap">
          <span className="ph-proof-item">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/movers-faces.webp" alt="" width={300} height={176} aria-hidden />
            <span>{d.hero.proofReal}</span>
          </span>
          <span className="ph-proof-sep" aria-hidden />
          <span className="ph-proof-item">
            <span className="ph-stars" aria-hidden>{[0, 1, 2, 3, 4].map((i) => <Star key={i} size={18} fill="currentColor" strokeWidth={0} />)}</span>
            <span>{d.hero.proofRated}</span>
          </span>
        </div>
      </div>
      <Below locale={locale} />
    </div>
  );
}

/**
 * entry: 'home' on the homepage (owner's test area: leads are not sent to movers, see lib/qa.ts),
 * 'qa' on the /qa test area (nothing is sent; a banner says so), nothing on the live funnels.
 * whatsapp: the /f landing (funnel E's page with a WhatsApp option in the lead card, see components/themed/WhatsAppCta.tsx).
 * locale: the page language (lib/i18n). Every landing except /qa also gets the floating WhatsApp button (WhatsAppFloat.tsx).
 */
export function ThemedLanding({ funnel, theme, entry = null, whatsapp = false, locale = DEFAULT_LOCALE }: { funnel: Funnel; theme: Theme; entry?: Entry; whatsapp?: boolean; locale?: Locale }) {
  const alt = entry === 'qa' ? null : altPath(locale, funnel, entry, whatsapp);
  return (
    <main>
      {entry === 'qa' && <QaBanner always />}
      {theme === 'art'
        ? <ArtLanding funnel={funnel} entry={entry} whatsapp={whatsapp} locale={locale} alt={alt} />
        : <PhotoLanding funnel={funnel} entry={entry} whatsapp={whatsapp} locale={locale} alt={alt} />}
      {entry !== 'qa' && <WhatsAppFloat funnel={funnel} theme={theme} landing={whatsapp ? 'f' : entry === 'home' ? 'home' : funnel} locale={locale} />}
    </main>
  );
}
