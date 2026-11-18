import { ShieldCheck } from 'lucide-react';
import React from 'react';
import { LEGAL } from '@/lib/legal';

export function Corners() {
  return (<><i className="corner tl" /><i className="corner tr" /><i className="corner bl" /><i className="corner br" /></>);
}

export function Blueprint({ as: Tag = 'div', className = '', children, ...rest }:
  { as?: React.ElementType; className?: string; children?: React.ReactNode } & Record<string, unknown>) {
  return <Tag className={`blueprint ${className}`} {...rest}><Corners />{children}</Tag>;
}

export function MidragBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`tag tag-accent badge ${className}`}>
      <ShieldCheck size={15} strokeWidth={1.5} aria-hidden />
      כל המובילים מדורגים
    </span>
  );
}

export function Header({ nav = false, badge = false, progress }: { nav?: boolean; badge?: boolean; progress?: string }) {
  return (
    <header className="site-header">
      <div className="wrap">
        <a href="/" className="wordmark" aria-label="MoveMatch">MOVEMATCH</a>
        {nav && (
          <nav className="site-nav" aria-label="ניווט">
            <a href="#how">איך זה עובד</a>
            <a href="#why">למה מובילים מדורגים</a>
          </nav>
        )}
        {badge && <MidragBadge className="desktop-only" />}
        {progress && <span className="header-progress mobile-only">{progress}</span>}
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <span>© {new Date().getFullYear()} MoveMatch · {LEGAL.entityShort}, ח.פ. {LEGAL.companyId}</span>
        <span>השירות ללא עלות ללקוח. הפרטים שלכם מועברים רק למובילים לצורך הצעת מחיר, ועדכונים על המכרז וההצעות יישלחו אליכם ב-SMS ובוואטסאפ.</span>
        <span className="foot-links"><a href="/privacy">מדיניות פרטיות</a><a href="/terms">תנאי שימוש</a><a href="/accessibility">הצהרת נגישות</a><a href="/our-movers">המובילים שלנו</a><a href="/movers/join">למובילים: הצטרפות</a></span>
      </div>
    </footer>
  );
}

export function Spinner() { return <span className="spinner" aria-hidden />; }
