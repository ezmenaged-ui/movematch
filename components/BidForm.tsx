'use client';
import { CalendarDays, CircleCheck } from 'lucide-react';
import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { Corners, Spinner } from './ui';

const KEY = 'mm_mover';

/** Mover quote form on the public lead page. Remembers the mover's phone/name on this device. */
type KnownMover = { token: string; company: string; logo: ReactNode };

/** With `mover` (personal link), phone and name come from the mover roster, so those fields are hidden. */
/** `endpoint` + `initial`: the signed-in mover panel posts to its own route and edits the existing offer. */
type Initial = { price: number; available_date: string | null; available_flexible: boolean; note: string | null };
export function BidForm({ token, requestedDate = '', requestedText = '', mover, endpoint, initial, onDoneText }: { token: string; requestedDate?: string; requestedText?: string; mover?: KnownMover; endpoint?: string; initial?: Initial | null; onDoneText?: string }) {
  const [v, setV] = useState({ mover_phone: '', mover_name: '', price: initial ? String(initial.price) : '', available_date: initial?.available_date || requestedDate, note: initial?.note || '' });
  const [flex, setFlex] = useState(!!initial?.available_flexible);
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<'' | 'new' | 'updated'>('');
  const [fail, setFail] = useState('');
  const [hp, setHp] = useState('');

  useEffect(() => {
    try { const m = JSON.parse(localStorage.getItem(KEY) || 'null'); if (m) setV((s) => ({ ...s, mover_phone: m.phone || '', mover_name: m.name || '' })); } catch { /* ignore */ }
  }, []);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setV((s) => ({ ...s, [k]: e.target.value })); setErr((x) => ({ ...x, [k]: '' })); };

  async function submit(e: FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    const phone = v.mover_phone.replace(/\D/g, '').replace(/^972/, '0');
    const price = Number(v.price.replace(/[^\d]/g, ''));
    if (!mover && !/^0\d{8,9}$/.test(phone)) er.mover_phone = 'מספר טלפון לא תקין';
    if (!price || price < 100) er.price = 'נא להזין מחיר בשקלים';
    setErr(er);
    if (Object.keys(er).length) return;
    setBusy(true); setFail('');
    try {
      const r = await fetch(endpoint || `/api/bids/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...v, mover_token: mover?.token || '', available_date: flex ? '' : v.available_date, available_flexible: flex, mover_phone: phone, price, website: hp }) });
      if (r.status === 409) { setFail('המכרז נסגר ולא ניתן להגיש בו הצעות.'); return; }
      if (r.status === 401) { location.href = '/movers/login'; return; }
      if (!r.ok) throw new Error();
      const j = await r.json();
      if (!mover) try { localStorage.setItem(KEY, JSON.stringify({ phone, name: v.mover_name })); } catch { /* ignore */ }
      setDone(j.updated ? 'updated' : 'new');
    } catch { setFail('משהו השתבש. נסו שוב בעוד רגע.'); } finally { setBusy(false); }
  }

  if (done) {
    return (
      <div className="bid-done" role="status">
        <CircleCheck size={28} strokeWidth={1.5} />
        <div>
          <b>{done === 'updated' ? 'ההצעה עודכנה.' : 'ההצעה נשלחה. תודה!'}</b>
          <p className="muted" style={{ margin: '4px 0 0' }}>{onDoneText ? onDoneText : mover ? 'ההצעה מופיעה עכשיו אצל הלקוח בדף המכרז, עם הלוגו, הדירוגים ופרטי הקשר שלכם. הלקוח יכול לפנות אליכם ישירות. רוצים לשנות? פשוט שלחו שוב.' : `ההצעה מופיעה עכשיו אצל הלקוח עם הטלפון ${v.mover_phone}, והלקוח יכול לפנות אליכם ישירות. רוצים לשנות? פשוט שלחו שוב עם אותו טלפון.`}</p>
          <button type="button" className="btn-link" style={{ padding: 0 }} onClick={() => setDone('')}>עריכת ההצעה</button>
          {endpoint && <> · <button type="button" className="btn-link" style={{ padding: 0 }} onClick={() => location.reload()}>רענון הדף</button></>}
        </div>
      </div>
    );
  }

  return (
    <form className="bid-form" onSubmit={submit} noValidate>
      {mover && <div className="bid-as">{mover.logo}<div><span className="small muted">מגישים הצעה בשם</span><br /><b>{mover.company}</b></div></div>}
      <div className="bid-row">
        <div className="field">
          <label htmlFor="bid-price">המחיר שלכם (₪, כולל מע״מ)</label>
          <input id="bid-price" className="input bid-price" inputMode="numeric" placeholder="לדוגמה 3,500" value={v.price} onChange={set('price')} aria-invalid={err.price ? 'true' : undefined} dir="ltr" />
          {err.price && <div className="field-error">{err.price}</div>}
        </div>
        {!mover && <div className="field">
          <label htmlFor="bid-phone">הטלפון שלכם</label>
          <input id="bid-phone" className="input" type="tel" inputMode="tel" autoComplete="tel" placeholder="050-0000000" value={v.mover_phone} onChange={set('mover_phone')} aria-invalid={err.mover_phone ? 'true' : undefined} dir="ltr" />
          {err.mover_phone && <div className="field-error">{err.mover_phone}</div>}
        </div>}
      </div>
      {!mover && <div className="bid-row">
        <div className="field">
          <label htmlFor="bid-name">שם / שם החברה (לא חובה)</label>
          <input id="bid-name" className="input" autoComplete="organization" value={v.mover_name} onChange={set('mover_name')} />
        </div>
      </div>}
      <div className="field bid-when">
        <label htmlFor="bid-date">מתי אתם פנויים?</label>
        {requestedText && <div className="bid-req"><CalendarDays size={15} strokeWidth={1.5} aria-hidden /> הלקוח ביקש: <b>{requestedText}</b></div>}
        <div className="bid-when-row">
          <input id="bid-date" className="input" type="date" value={flex ? '' : v.available_date} disabled={flex}
            onChange={set('available_date')} dir="ltr" style={{ textAlign: 'right' }} />
          <button type="button" className={`time-tile bid-flex ${flex ? 'on' : ''}`} aria-pressed={flex} onClick={() => setFlex((f) => !f)}>
            <b>{flex ? '✓ ' : ''}אני גמיש בתאריך</b>
          </button>
        </div>
      </div>
      <div className="field">
        <label htmlFor="bid-note">הערה (לא חובה)</label>
        <textarea id="bid-note" className="input" rows={2} placeholder="למשל: כולל פירוק והרכבה, מנוף לא כלול" value={v.note} onChange={set('note')} />
      </div>
      <input className="visually-hidden" tabIndex={-1} autoComplete="off" aria-hidden value={hp} onChange={(e) => setHp(e.target.value)} />
      <button type="submit" className="btn btn-primary btn-lg blueprint" disabled={busy} aria-busy={busy}><Corners />{busy && <Spinner />} {initial ? 'עדכון ההצעה' : 'שליחת הצעת מחיר'}</button>
      {fail && <div className="field-error" role="alert">{fail}</div>}
    </form>
  );
}
