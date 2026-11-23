import { lp, t, type Locale } from '@/lib/i18n';

/** Footer links. Pages that exist only in Hebrew are marked so on the English site. */
export function FootLinks({ locale }: { locale: Locale }) {
  const f = t(locale).footer;
  return (
    <span className="foot-links">
      <a href={lp(locale, '/privacy')}>{f.privacy}</a><a href={lp(locale, '/terms')}>{f.terms}</a>
      <a href="/accessibility">{f.accessibility}{f.hebrewOnly}</a><a href="/our-movers">{f.ourMovers}{f.hebrewOnly}</a>
      {locale === 'he' && <a href="/movers/join">{f.moversJoin}</a>}
    </span>
  );
}
