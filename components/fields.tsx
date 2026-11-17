'use client';
import { Check } from 'lucide-react';
import React, { useId, useMemo, useState } from 'react';
import { CITIES, Crane, CRANE_OPTIONS, ELEVATOR_TYPES, ElevatorType, Parking, PARKING_OPTIONS } from '@/lib/validate';
import { Corners } from './ui';

type FieldProps = {
  label: string; value: string; onChange: (v: string) => void; error?: string;
  type?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']; autoComplete?: string;
  placeholder?: string; name?: string; onBlur?: () => void; list?: string; dir?: string; inputRef?: React.Ref<HTMLInputElement>;
};

export function Field({ label, value, onChange, error, type = 'text', inputMode, autoComplete, placeholder, name, onBlur, list, dir, inputRef }: FieldProps) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        ref={inputRef} id={id} name={name} className="input" type={type} inputMode={inputMode} autoComplete={autoComplete}
        placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} list={list} dir={dir}
        aria-invalid={error ? 'true' : undefined} aria-describedby={error ? id + '-e' : undefined}
      />
      {error && <div className="field-error" id={id + '-e'} role="alert">{error}</div>}
    </div>
  );
}

export function PhoneField(p: Omit<FieldProps, 'label' | 'type'> & { label?: string }) {
  return <Field label={p.label || 'טלפון'} type="tel" inputMode="tel" autoComplete="tel" dir="ltr" placeholder="050-0000000" {...p} />;
}

/** City with our own suggestion list (works on every phone; the native datalist hides itself on iOS when prefilled).
 *  Free text is always allowed. */
export function CityField({ label = 'עיר', value, onChange, error, name, placeholder }: Omit<FieldProps, 'label' | 'list'> & { label?: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const matches = useMemo(() => {
    const q = value.trim();
    if (!q) return CITIES.slice(0, 8);
    const starts = CITIES.filter((c) => c.startsWith(q) && c !== q);
    const has = CITIES.filter((c) => !c.startsWith(q) && c.includes(q));
    return [...starts, ...has].slice(0, 8);
  }, [value]);
  const show = open && matches.length > 0;
  const pick = (c: string) => { onChange(c); setOpen(false); setHi(-1); };
  return (
    <div className="field city-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id} name={name} className="input" type="text" autoComplete="off" placeholder={placeholder || 'התחילו להקליד…'}
        value={value} onChange={(e) => { onChange(e.target.value); setOpen(true); setHi(-1); }}
        onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (!show) return;
          if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(matches.length - 1, h + 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
          else if (e.key === 'Enter' && hi >= 0) { e.preventDefault(); pick(matches[hi]); }
          else if (e.key === 'Escape') setOpen(false);
        }}
        role="combobox" aria-expanded={show} aria-controls={id + '-l'} aria-autocomplete="list"
        aria-invalid={error ? 'true' : undefined} aria-describedby={error ? id + '-e' : undefined}
      />
      {show && (
        <ul className="city-list" id={id + '-l'} role="listbox">
          {matches.map((c, i) => (
            <li key={c} role="option" aria-selected={i === hi}>
              <button type="button" className={i === hi ? 'hi' : ''} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(c)}>{c}</button>
            </li>
          ))}
        </ul>
      )}
      {error && <div className="field-error" id={id + '-e'} role="alert">{error}</div>}
    </div>
  );
}

export function CityDatalist() {
  return <datalist id="il-cities">{CITIES.map((c) => <option key={c} value={c} />)}</datalist>;
}

export function CheckRow({ checked, onChange, children, className = '' }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode; className?: string }) {
  return (
    <label className={`blueprint check-row ${checked ? 'selected' : ''} ${className}`}>
      <Corners />
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="check-box">{checked && <Check size={15} strokeWidth={2} aria-hidden />}</span>
      <span>{children}</span>
    </label>
  );
}

/** Mobile: single checkbox row. Desktop: two big tiles (mockup 2f). Value null = not answered. */
/** Shown after "יש מעלית": the elevator size decides whether big furniture fits. */
export function ElevatorTypePicker({ value, onChange, error }: { value: ElevatorType | '' | undefined; onChange: (v: ElevatorType) => void; error?: string }) {
  return (
    <div className="elev-type" role="radiogroup" aria-label="איזו מעלית?">
      <div className="small" style={{ marginBottom: 8, color: 'var(--color-neutral-700)' }}>איזו מעלית? <b style={{ color: 'var(--color-text)' }}>(חשוב למובילים)</b></div>
      <div className={`elev-tiles ${error ? 'invalid' : ''}`}>
        {ELEVATOR_TYPES.map((t) => (
          <button key={t.v} type="button" role="radio" aria-checked={value === t.v} className={`time-tile ${value === t.v ? 'on' : ''}`} onClick={() => onChange(t.v)}>
            <b>{value === t.v ? '✓ ' : ''}{t.label}</b>
          </button>
        ))}
      </div>
      {error && <div className="field-error" role="alert">{error}</div>}
    </div>
  );
}

export function ElevatorChoice({ value, onChange, error }: { value: boolean | null; onChange: (v: boolean) => void; error?: string }) {
  return (
    <div>
      <div className="mobile-only" style={{ display: undefined }}>
        <CheckRow checked={value === true} onChange={(v) => onChange(v)}>יש מעלית בכניסה לבניין</CheckRow>
      </div>
      <div className="desktop-only" role="radiogroup" aria-label="יש מעלית בכניסה לבניין?">
        <div className="small" style={{ marginBottom: 8, color: 'var(--color-neutral-700)' }}>יש מעלית בכניסה לבניין?</div>
        <div className={`choice-tiles ${error ? 'invalid' : ''}`}>
          <CheckRow checked={value === true} onChange={() => onChange(true)}>יש מעלית</CheckRow>
          <CheckRow checked={value === false} onChange={() => onChange(false)}>רק מדרגות</CheckRow>
        </div>
        {error && <div className="field-error" role="alert">{error}</div>}
      </div>
    </div>
  );
}

/** Can a crane be used at this address? Asked for both addresses. */
export function CranePicker({ value, onChange, error }: { value: Crane | '' | undefined; onChange: (v: Crane) => void; error?: string }) {
  return (
    <div className="elev-type" role="radiogroup" aria-label="אפשר להשתמש במנוף בכתובת הזו?">
      <div className="small" style={{ marginBottom: 4, color: 'var(--color-neutral-700)' }}>אפשר להשתמש במנוף בכתובת הזו?</div>
      <div className="small muted" style={{ marginBottom: 8, fontSize: 13 }}>בדרך כלל יודעים מההובלה הקודמת. תלוי בעצים ובחוטי חשמל מול החלון או המרפסת.</div>
      <div className={`elev-tiles ${error ? 'invalid' : ''}`}>
        {CRANE_OPTIONS.map((t) => (
          <button key={t.v} type="button" role="radio" aria-checked={value === t.v} className={`time-tile ${value === t.v ? 'on' : ''}`} onClick={() => onChange(t.v)}>
            <b>{value === t.v ? '✓ ' : ''}{t.label}</b>
          </button>
        ))}
      </div>
      {error && <div className="field-error" role="alert">{error}</div>}
    </div>
  );
}

/** Distance from where the truck can park to the building entrance: one of the biggest price factors. */
export function ParkingPicker({ value, onChange, error }: { value: Parking | '' | undefined; onChange: (v: Parking) => void; error?: string }) {
  return (
    <div className="elev-type" role="radiogroup" aria-label="מה המרחק מהמקום הקרוב שבו המשאית יכולה לחנות ועד הכניסה לבניין?">
      <div className="small" style={{ marginBottom: 4, color: 'var(--color-neutral-700)' }}>מה המרחק מהמקום הקרוב שבו המשאית יכולה לחנות ועד הכניסה לבניין?</div>
      <div className="small" style={{ marginBottom: 8, fontSize: 13, color: 'var(--color-text)' }}><b>זה משנה את המחיר מאוד:</b> משאית שעומדת 10 מטר מהכניסה זה דבר אחר לגמרי ממשאית שעומדת במרחק 100 מטר, או שאין לה איפה לעצור.</div>
      <div className={`elev-tiles park-tiles ${error ? 'invalid' : ''}`}>
        {PARKING_OPTIONS.map((t) => (
          <button key={t.v} type="button" role="radio" aria-checked={value === t.v} className={`time-tile ${value === t.v ? 'on' : ''}`} onClick={() => onChange(t.v)}>
            <b>{value === t.v ? '✓ ' : ''}{t.label}</b>
          </button>
        ))}
      </div>
      {error && <div className="field-error" role="alert">{error}</div>}
    </div>
  );
}
