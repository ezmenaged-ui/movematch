/** A small mover carrying a box, walking back and forth: "we're on it, this takes a little while". Pure SVG + CSS. */
export function WalkingMover() {
  return (
    <div className="wm" aria-hidden>
      <div className="wm-track">
        <div className="wm-walker">
          <svg viewBox="0 0 64 80" width="64" height="80">
            {/* box */}
            <g className="wm-box">
              <rect x="30" y="26" width="24" height="20" rx="2" fill="#e8c48f" stroke="#b8894f" strokeWidth="1.5" />
              <path d="M30 32h24M42 26v6" stroke="#b8894f" strokeWidth="1.5" />
            </g>
            {/* body */}
            <circle cx="24" cy="14" r="7" fill="#f2c9a5" />
            <path d="M17 12c1-6 13-7 14 0z" fill="#1f4d8f" />
            <rect x="16" y="22" width="16" height="22" rx="6" fill="#1f6fd1" />
            <path className="wm-arm" d="M28 28l8 4" stroke="#1f6fd1" strokeWidth="5" strokeLinecap="round" />
            {/* legs */}
            <g className="wm-leg wm-leg-a"><path d="M21 43l-3 16" stroke="#0f2a43" strokeWidth="5" strokeLinecap="round" /><path d="M18 59h-4" stroke="#0f2a43" strokeWidth="5" strokeLinecap="round" /></g>
            <g className="wm-leg wm-leg-b"><path d="M27 43l3 16" stroke="#0f2a43" strokeWidth="5" strokeLinecap="round" /><path d="M30 59h4" stroke="#0f2a43" strokeWidth="5" strokeLinecap="round" /></g>
          </svg>
        </div>
        <span className="wm-floor" />
      </div>
    </div>
  );
}
