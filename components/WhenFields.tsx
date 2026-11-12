'use client';
import { useId } from 'react';
import { TIME_LABEL, When } from '@/lib/validate';
import { CheckRow } from './fields';

/** Move date + time window, each with its own "flexible" checkbox. */
export function WhenFields({ value, onChange, error }: { value: When; onChange: (w: When) => void; error?: string }) {
  const id = useId();
  const set = <K extends keyof When>(k: K, v: When[K]) => onChange({ ...value, [k]: v });
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  return (
    <div className="stack when">
      <div className="field">
        <label htmlFor={id}>תאריך ההובלה</label>
        <input id={id} type="date" className="input" min={today} value={value.date} onChange={(e) => set('date', e.target.value)}
          aria-invalid={error ? 'true' : undefined} dir="ltr" />
        {error && <div className="field-error" role="alert">{error}</div>}
      </div>
      <CheckRow checked={value.date_flexible} onChange={(v) => set('date_flexible', v)}>אני גמיש/ה בתאריך</CheckRow>

      <div className="field">
        <label>שעה מועדפת</label>
        <div className="time-tiles" role="radiogroup" aria-label="שעה מועדפת">
          {(Object.keys(TIME_LABEL) as (keyof typeof TIME_LABEL)[]).map((k) => {
            const [title, range] = TIME_LABEL[k].split(' (');
            return (
              <button key={k} type="button" role="radio" aria-checked={value.time === k}
                className={`time-tile ${value.time === k ? 'on' : ''}`} onClick={() => set('time', value.time === k ? '' : (k as When['time']))}>
                <b>{title}</b><small>{range?.replace(')', '')}</small>
              </button>
            );
          })}
        </div>
      </div>
      <CheckRow checked={value.time_flexible} onChange={(v) => set('time_flexible', v)}>אני גמיש/ה בשעה</CheckRow>
      <p className="when-tip">💡 גמישות בתאריך או בשעה יכולה להוזיל את המחיר. מובילים נותנים מחיר טוב יותר כשהם יכולים לשבץ את ההובלה ביום ובשעה שנוחים להם.</p>
    </div>
  );
}
