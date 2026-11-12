/** MoveMatch brand mark: the map pin with a house (as on the trucks) plus the wordmark. */
export function Logo({ className = '' }: { className?: string }) {
  return (
    <a href="/" className={`lp-logo ${className}`} aria-label="MoveMatch" dir="ltr">
      <svg viewBox="0 0 40 50" width="34" height="42" aria-hidden>
        <path d="M20 2a17.5 17.5 0 0 0-17.5 17.5C2.5 33 20 48 20 48s17.5-15 17.5-28.5A17.5 17.5 0 0 0 20 2z" fill="var(--lp-teal)" />
        <circle cx="20" cy="19.5" r="11.5" fill="#fff" />
        <path d="M12.5 21 20 13.6l7.5 7.4V27a1 1 0 0 1-1 1H22v-4.6h-4V28h-4.5a1 1 0 0 1-1-1z" fill="var(--lp-navy)" />
      </svg>
      <span><b>Move</b><i>Match</i></span>
    </a>
  );
}

/** Hand-drawn style underline used under a key word in headings. */
export function Swoosh({ className = '' }: { className?: string }) {
  return (
    <svg className={`lp-swoosh ${className}`} viewBox="0 0 200 14" preserveAspectRatio="none" aria-hidden>
      <path d="M4 10C60 3 140 2 196 6" fill="none" stroke="url(#lpsw)" strokeWidth="5" strokeLinecap="round" />
      <defs><linearGradient id="lpsw" x1="0" x2="1"><stop offset="0" stopColor="#7cc4f5" /><stop offset="1" stopColor="#1769d6" /></linearGradient></defs>
    </svg>
  );
}
