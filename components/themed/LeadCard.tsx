'use client';
import { LegalNote } from '../LegalNote';
import { ArrowLeft, ChevronDown, ChevronLeft, CircleCheck, Coins, Lock, MapPin, Phone, Tag, Timer, User } from 'lucide-react';
import React, { useEffect, useId } from 'react';
import type { Funnel } from '@/lib/handoff';
import { Entry, funnelParams, getAttribution, setEntry, track, trackStep } from '@/lib/client';
import { CityDatalist } from '../fields';
import { Theme, useCallbackLead } from '../CallbackForm';
import { Spinner } from '../ui';
import { ROOMS_OPTIONS } from '@/lib/validate';
import { Swoosh } from './Logo';

type FP = {
  icon: React.ReactNode; label: string; value: string; onChange: (v: string) => void; error?: string;
  type?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']; autoComplete?: string; name: string;
  list?: string; dir?: string; chevron?: boolean;
};

function IconField({ icon, label, value, onChange, error, type = 'text', inputMode, autoComplete, name, list, dir, chevron }: FP) {
  const id = useId();
  return (
    <div className="lp-field">
      <label htmlFor={id} className="visually-hidden">{label}</label>
      <div className={`lp-input ${error ? 'invalid' : ''}`}>
        <span className="lp-ico" aria-hidden>{icon}</span>
        <input id={id} name={name} type={type} inputMode={inputMode} autoComplete={autoComplete} placeholder={label}
          value={value} onChange={(e) => onChange(e.target.value)} list={list} dir={dir}
          aria-invalid={error ? 'true' : undefined} aria-describedby={error ? id + '-e' : undefined} />
        {chevron && <ChevronDown className="lp-chev" size={20} strokeWidth={1.75} aria-hidden />}
      </div>
      {error && <div className="lp-err" id={id + '-e'} role="alert">{error}</div>}
    </div>
  );
}

/** The quote-request card used by both themes. Same lead logic as the original first step. */
export function LeadCard({ funnel, theme, entry = null }: { funnel: Funnel; theme: Theme; entry?: Entry }) {
  const { v, set, rooms, setRooms, err, busy, done, fail, hp, setHp, submit } = useCallbackLead(funnel, theme, '.lp-form');

  useEffect(() => { setEntry(entry); getAttribution(); /* keep the ad click (gclid, UTMs) for this visitor */ track('landing_view', funnelParams(funnel, theme)); trackStep(funnel, theme, 0, 'landing'); }, [funnel, theme, entry]);

  if (done) {
    return (
      <div className="lp-card lp-done" role="status">
        <CircleCheck size={44} strokeWidth={1.5} aria-hidden />
        <h2>תודה! נחזור אליכם בקרוב עם 5 הצעות.</h2>
        <p>נציג יתקשר מהמספר שלנו בהקדם, בדרך כלל באותו יום.</p>
      </div>
    );
  }

  const art = theme === 'art';
  return (
    <form className="lp-card lp-form" onSubmit={submit} noValidate>
      <h2 className="lp-card-title">
        {art
          ? <>קבלו <span className="lp-hl">5<Swoosh /></span> הצעות להובלה בחינם</>
          : <>קבלו עד 5 <span className="lp-hl">הצעות<Swoosh /></span> להובלה</>}
      </h2>
      <CityDatalist />
      <div className="lp-fields">
        <IconField icon={<User size={22} strokeWidth={1.5} />} label="שם מלא" name="name" autoComplete="name" value={v.name} onChange={set('name')} error={err.name} />
        <IconField icon={<Phone size={21} strokeWidth={1.5} />} label="מספר טלפון" name="phone" type="tel" inputMode="tel" autoComplete="tel" value={v.phone} onChange={set('phone')} error={err.phone} />
        <IconField icon={<MapPin size={22} strokeWidth={1.5} />} label="עיר מוצא" name="city" list="il-cities" autoComplete="address-level2" value={v.city} onChange={set('city')} error={err.city} chevron />
        {funnel === 'a' && ( // A has no origin step: optional home size here (B–E ask it, required, on their origin step)
          <div className="lp-rooms" role="radiogroup" aria-label="כמה חדרים בדירה? (לא חובה)">
            <div className="lp-rooms-q">כמה חדרים בדירה? <span>(כולל סלון, לא חובה)</span></div>
            <div className="lp-rooms-chips">
              {ROOMS_OPTIONS.map((o) => (
                <button key={o.v} type="button" role="radio" aria-checked={rooms === o.v} aria-label={o.label}
                  className={rooms === o.v ? 'on' : ''} onClick={() => setRooms(rooms === o.v ? '' : o.v)}><bdi dir="ltr">{o.short}</bdi></button>
              ))}
            </div>
          </div>
        )}
      </div>
      <input className="visually-hidden" tabIndex={-1} autoComplete="off" aria-hidden name="website" value={hp} onChange={(e) => setHp(e.target.value)} />
      <button type="submit" className="lp-btn" aria-busy={busy} disabled={busy}>
        {busy && <Spinner />}
        {art ? <>קבלו הצעות עכשיו <ChevronLeft size={24} strokeWidth={2.5} aria-hidden /></> : <>קבלו 5 הצעות בחינם <ArrowLeft size={24} strokeWidth={2.25} aria-hidden /></>}
      </button>
      <LegalNote className="lp-legal" />
      {fail && <div className="lp-err" role="alert" style={{ textAlign: 'center' }}>{fail}</div>}
      {art ? (
        <ul className="lp-perks">
          <li><Tag size={30} strokeWidth={1.4} aria-hidden />עד 5 הצעות מחיר</li>
          <li><Timer size={30} strokeWidth={1.4} aria-hidden />תוך דקות</li>
          <li><Coins size={30} strokeWidth={1.4} aria-hidden />ללא עלות</li>
        </ul>
      ) : (
        <p className="lp-secure"><Lock size={16} strokeWidth={1.75} aria-hidden /> ללא עלות וללא התחייבות</p>
      )}
    </form>
  );
}
