'use client';
import { Check } from 'lucide-react';
import React, { useId, useMemo, useState } from 'react';
import { CITIES, Crane, CRANE_OPTIONS, ELEVATOR_TYPES, ElevatorType, Parking, PARKING_OPTIONS, Rooms, ROOMS_OPTIONS } from '@/lib/validate';
import { CITIES_EN } from '@/lib/cities';
import { Corners } from './ui';
import { useLocale, useT } from './Locale';

/** The city suggestions in the page language (English names on /en; they are saved in Hebrew, see lib/cities.ts). */
const useCities = () => (useLocale() === 'en' ? CITIES_EN : CITIES);

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
  const d = useT();
  return <Field label={p.label || d.fields.phone} type="tel" inputMode="tel" autoComplete="tel" dir="ltr" placeholder="050-0000000" {...p} />;
}

/** City with our own suggestion list (works on every phone; the native datalist hides itself on iOS when prefilled).
 *  Free text is always allowed. */
export function CityField({ label, value, onChange, error, name, placeholder }: Omit<FieldProps, 'label' | 'list'> & { label?: string }) {
  const id = useId();
  const d = useT();
  const CITIES = useCities();
  label ??= d.fields.city;
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const matches = useMemo(() => {
    const q = value.trim();
    if (!q) return CITIES.slice(0, 8);
    const lq = q.toLowerCase();
    const starts = CITIES.filter((c) => c.toLowerCase().startsWith(lq) && c !== q);
    const has = CITIES.filter((c) => !c.toLowerCase().startsWith(lq) && c.toLowerCase().includes(lq));
    return [...starts, ...has].slice(0, 8);
  }, [value, CITIES]);
  const show = open && matches.length > 0;
  const pick = (c: string) => { onChange(c); setOpen(false); setHi(-1); };
  return (
    <div className="field city-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id} name={name} className="input" type="text" autoComplete="off" placeholder={placeholder || d.fields.cityPh}
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
  const CITIES = useCities();
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
  const d = useT();
  return (
    <div className="elev-type" role="radiogroup" aria-label={d.fields.elevatorTypeQ}>
      <div className="small" style={{ marginBottom: 8, color: 'var(--color-neutral-700)' }}>{d.fields.elevatorTypeQ} <b style={{ color: 'var(--color-text)' }}>{d.fields.elevatorTypeWhy}</b></div>
      <div className={`elev-tiles ${error ? 'invalid' : ''}`}>
        {ELEVATOR_TYPES.map((t) => (
          <button key={t.v} type="button" role="radio" aria-checked={value === t.v} className={`time-tile ${value === t.v ? 'on' : ''}`} onClick={() => onChange(t.v)}>
            <b>{value === t.v ? '✓ ' : ''}{d.opts.elevator[t.v] || t.label}</b>
          </button>
        ))}
      </div>
      {error && <div className="field-error" role="alert">{error}</div>}
    </div>
  );
}

export function ElevatorChoice({ value, onChange, error }: { value: boolean | null; onChange: (v: boolean) => void; error?: string }) {
  // Same two tiles on every screen, so the answer is always explicit.
  const d = useT();
  return (
    <div role="radiogroup" aria-label={d.fields.elevatorQ}>
      <div className="small" style={{ marginBottom: 8, color: 'var(--color-neutral-700)' }}>{d.fields.elevatorQ}</div>
      <div className={`choice-tiles ${error ? 'invalid' : ''}`}>
        <CheckRow checked={value === true} onChange={() => onChange(true)}>{d.fields.hasElevator}</CheckRow>
        <CheckRow checked={value === false} onChange={() => onChange(false)}>{d.fields.stairsOnly}</CheckRow>
      </div>
      {error && <div className="field-error" role="alert">{error}</div>}
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
  const d = useT();
  return (
    <div className="elev-type" role="radiogroup" aria-label={d.fields.parkingQ}>
      <div className="small" style={{ marginBottom: 4, color: 'var(--color-neutral-700)' }}>{d.fields.parkingQ}</div>
      <div className="small" style={{ marginBottom: 8, fontSize: 13, color: 'var(--color-text)' }}><b>{d.fields.parkingWhy[0]}</b>{d.fields.parkingWhy[1]}</div>
      <div className={`elev-tiles park-tiles ${error ? 'invalid' : ''}`}>
        {PARKING_OPTIONS.map((t) => (
          <button key={t.v} type="button" role="radio" aria-checked={value === t.v} className={`time-tile ${value === t.v ? 'on' : ''}`} onClick={() => onChange(t.v)}>
            <b>{value === t.v ? '✓ ' : ''}{d.opts.parking[t.v] || t.label}</b>
          </button>
        ))}
      </div>
      {error && <div className="field-error" role="alert">{error}</div>}
    </div>
  );
}

/** Size of the home they're moving from (origin step of every funnel). */
export function RoomsPicker({ value, onChange, error }: { value: Rooms | '' | undefined; onChange: (v: Rooms) => void; error?: string }) {
  const d = useT();
  return (
    <div className="elev-type" role="radiogroup" aria-label={d.fields.roomsQ}>
      <div className="small" style={{ marginBottom: 4, color: 'var(--color-neutral-700)' }}>{d.fields.roomsQ}</div>
      <div className="small" style={{ marginBottom: 8, fontSize: 13, color: 'var(--color-text)' }}>{d.fields.roomsHint}</div>
      <div className={`elev-tiles rooms-tiles ${error ? 'invalid' : ''}`}>
        {ROOMS_OPTIONS.map((t) => (
          <button key={t.v} type="button" role="radio" aria-checked={value === t.v} aria-label={d.opts.rooms[t.v]?.label || t.label} className={`time-tile ${value === t.v ? 'on' : ''}`} onClick={() => onChange(t.v)}>
            <b>{value === t.v ? '✓ ' : ''}<bdi dir="ltr">{d.opts.rooms[t.v]?.short || t.short}</bdi></b>{t.v !== 'house' && <span>{d.opts.roomsWord}</span>}
          </button>
        ))}
      </div>
      {error && <div className="field-error" role="alert">{error}</div>}
    </div>
  );
}
