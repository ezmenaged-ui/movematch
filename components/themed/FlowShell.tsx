'use client';
import type { FlowTheme } from '@/lib/handoff';
import { Logo } from './Logo';
import { QaBanner } from '../QaBanner';
import { useLocale } from '../Locale';
import { lp, t } from '@/lib/i18n';
import '../../app/landing.css';

/** Page frame for the follow-up pages (/b/steps, /c/details) so they keep the landing page's theme. */
export function FlowShell({ theme, progress, children }: { theme: FlowTheme | null; progress?: string; children?: React.ReactNode }) {
  const locale = useLocale();
  if (!theme) return <div className="fl-blank" />;
  return (
    <div className={`lp lp-${theme} lp-flow`}>
      <QaBanner />
      <div className="fl-bg" aria-hidden>
        {theme === 'photo' ? (
          <picture>
            <source media="(min-width: 900px)" srcSet="/hero-real-800.webp 836w, /hero-real-1600.webp 1672w" sizes="100vw" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hero-real-mobile.webp" alt="" width={392} height={628} />
          </picture>
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="art-leaves" src="/art-leaves.webp" alt="" width={320} height={280} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="fl-art-movers" src="/art-movers.webp" alt="" width={480} height={611} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="fl-art-building" src="/art-building.webp" alt="" width={477} height={621} />
          </>
        )}
      </div>
      <header className="fl-head lp-wrap">
        <Logo href={lp(locale, '/')} />
        {progress && <span className="fl-progress">{progress}</span>}
      </header>
      <main className="fl-main">{children}</main>
      <footer className="lp-foot">
        <div className="lp-wrap">
          <span>© {new Date().getFullYear()} MoveMatch</span>
          <span>{t(locale).flow.note} <a href={lp(locale, '/privacy')}>{t(locale).footer.privacy}</a></span>
        </div>
      </footer>
    </div>
  );
}
