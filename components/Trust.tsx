import { Check } from 'lucide-react';

export const TRUST = ['חינם ובלי התחייבות', 'כל המובילים מדורגים', 'אנחנו מתמקחים בשבילכם על המחיר'];

export function TrustList({ className = '' }: { className?: string }) {
  return (
    <ul className={`trust ${className}`}>
      {TRUST.map((t) => <li key={t}><span className="trust-tick"><Check size={14} strokeWidth={2.5} aria-hidden /></span>{t}</li>)}
    </ul>
  );
}
