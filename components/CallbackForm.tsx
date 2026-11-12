'use client';
import { CircleCheck } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Funnel, NEXT_PATH, saveHandoff, VARIANT } from '@/lib/handoff';
import { createLead, PhoneRecentError, track } from '@/lib/client';
import { isValidName, isValidPhone, MSG, normalizePhone, phoneRecentMsg } from '@/lib/validate';
import { CityDatalist, CityField, Field, PhoneField } from './fields';
import { Blueprint, Corners, MidragBadge, Spinner } from './ui';
import { LegalNote } from './LegalNote';

export type { FlowTheme as Theme } from '@/lib/handoff';
import type { FlowTheme as Theme } from '@/lib/handoff';

/** Shared submit logic for the first step (old design and the themed landings). */
export function useCallbackLead(funnel: Funnel, theme?: Theme, formSel = '.hero-form') {
  const router = useRouter();
  const [v, setV] = useState({ name: '', phone: '', city: '' });
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [fail, setFail] = useState('');
  const [hp, setHp] = useState('');

  const set = (k: keyof typeof v) => (x: string) => { setV((s) => ({ ...s, [k]: x })); if (err[k]) setErr((e) => ({ ...e, [k]: '' })); };

  async function submit(e: FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!isValidName(v.name)) er.name = MSG.name;
    if (!isValidPhone(v.phone)) er.phone = MSG.phone;
    if (!v.city.trim()) er.city = MSG.city;
    setErr(er);
    if (Object.keys(er).length) {
      (document.querySelector(`${formSel} [aria-invalid="true"]`) as HTMLInputElement | null)?.focus();
      return;
    }
    setBusy(true); setFail('');
    let leaving = false;
    try {
      const fields = { name: v.name.trim(), phone: normalizePhone(v.phone), city: v.city.trim() };
      const isA = funnel === 'a';
      const ref = await createLead(VARIANT[funnel], { ...fields, status: isA ? 'complete' : 'partial', furthest_step: 1 }, hp);
      track('lead_created', theme ? { funnel, theme, variant_id: `${funnel}-${theme}` } : { funnel });
      if (isA) { setDone(true); return; }
      saveHandoff({ funnel, ref, ...fields, theme });
      leaving = true;
      router.push(NEXT_PATH[funnel] + window.location.search);
    } catch (e) {
      if (e instanceof PhoneRecentError) setErr({ phone: phoneRecentMsg(e.until) });
      else setFail('משהו השתבש. נסו שוב בעוד רגע.');
    } finally { if (!leaving) setBusy(false); }
  }
  return { v, set, err, busy, done, fail, hp, setHp, submit };
}

/** Shared first step. Funnel A ends here (callback); B and C continue to their next page. */
export function CallbackForm({ funnel = 'a' }: { funnel?: Funnel }) {
  const { v, set, err, busy, done, fail, hp, setHp, submit } = useCallbackLead(funnel);

  if (done) {
    return (
      <Blueprint className="success" role="status">
        <span className="success-icon blueprint"><Corners /><CircleCheck size={24} strokeWidth={1.5} /></span>
        <div>
          <h2>תודה! נחזור אליכם בקרוב עם 5 הצעות.</h2>
          <p className="muted" style={{ margin: 0 }}>נציג יתקשר מהמספר שלנו בהקדם, בדרך כלל באותו יום.</p>
        </div>
      </Blueprint>
    );
  }

  return (
    <Blueprint as="form" className="hero-form" onSubmit={submit} noValidate>
      <CityDatalist />
      <div className="fields">
        <Field label="שם מלא" value={v.name} onChange={set('name')} error={err.name} autoComplete="name" name="name" />
        <PhoneField value={v.phone} onChange={set('phone')} error={err.phone} name="phone" />
        <CityField value={v.city} onChange={set('city')} error={err.city} name="city" />
      </div>
      <input className="visually-hidden" tabIndex={-1} autoComplete="off" aria-hidden name="website" value={hp} onChange={(e) => setHp(e.target.value)} />
      <div className="actions">
        <button type="submit" className="btn btn-primary btn-lg blueprint" aria-busy={busy} disabled={busy}>
          <Corners />{busy && <Spinner />} קבלו 5 הצעות
        </button>
        <MidragBadge />
      </div>
      <LegalNote />
      {fail && <div className="field-error" role="alert" style={{ marginTop: 10 }}>{fail}</div>}
    </Blueprint>
  );
}
