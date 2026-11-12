'use client';

/** 5-point preference between service quality (1) and price (5). Saved with the lead as `priority`. */
const STOPS = [
  { v: 1, label: 'שירות פרימיום' },
  { v: 2, label: 'בעיקר שירות' },
  { v: 3, label: 'איזון' },
  { v: 4, label: 'בעיקר מחיר' },
  { v: 5, label: 'המחיר הנמוך' },
];

export function PriorityScale({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const cur = STOPS.find((s) => s.v === value) || STOPS[2];
  return (
    <fieldset className="prio">
      <legend>מה הכי חשוב לך במוביל?</legend>
      <p className="prio-sub">כך נדע אילו מובילים מתאימים לך ושולחים לך הצעות.</p>
      <div className="prio-ends" aria-hidden><span>⭐ שירות</span><span>₪ מחיר</span></div>
      <div className="prio-track" role="radiogroup" aria-label="שירות או מחיר">
        {STOPS.map((s) => (
          <button key={s.v} type="button" role="radio" aria-checked={value === s.v} aria-label={s.label}
            className={`prio-dot ${value === s.v ? 'on' : ''} ${s.v <= value ? 'fill' : ''}`} onClick={() => onChange(s.v)}>
            <i />
          </button>
        ))}
      </div>
      <div className="prio-now" aria-live="polite">{cur.label}</div>
    </fieldset>
  );
}
