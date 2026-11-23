'use client';
import { useEffect, useState } from 'react';
import { MessageCircle, Phone } from 'lucide-react';
import { getUtm, track } from '@/lib/client';
import { revealPhone } from './actions';

const KEY = 'mm_reveal';
const ERR = {
  name: 'כתבו את השם שלכם.',
  phone: 'מספר הנייד לא תקין. כתבו אותו כמו 0501234567.',
  limit: 'יותר מדי בקשות מהמספר הזה היום. נסו שוב מחר.',
  fail: 'משהו השתבש. נסו שוב.',
} as const;

const pretty = (p: string) => (p.length === 10 ? `${p.slice(0, 3)}-${p.slice(3)}` : p);

/** "Show the number": the client leaves name + phone (so we know they came through MoveMatch), then sees the mover's number. */
export function RevealPhone({ slug, company, firstName }: { slug: string; company: string; firstName?: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<keyof typeof ERR | null>(null);
  const [shown, setShown] = useState<string | null>(null);

  useEffect(() => {
    try { const s = JSON.parse(localStorage.getItem(KEY) || '{}'); if (s.name) setName(s.name); if (s.phone) setPhone(s.phone); } catch {}
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const r = await revealPhone(slug, { name, phone, utm: getUtm() });
      if (!r.ok) { setErr(r.error); return; }
      setShown(r.phone);
      try { localStorage.setItem(KEY, JSON.stringify({ name, phone })); } catch {}
      track('mover_phone_reveal', { mover: slug });
    } catch { setErr('fail'); } finally { setBusy(false); }
  }

  if (shown) {
    const intl = `972${shown.slice(1)}`;
    const hi = encodeURIComponent(`היי${firstName ? ` ${firstName}` : ''}, הגעתי אליכם דרך MoveMatch ואשמח להצעת מחיר להובלה.`);
    return (
      <div role="status">
        <p>המספר של {company}:</p>
        <a className="om-phone" href={`tel:${shown}`} dir="ltr">{pretty(shown)}</a>
        <div className="om-phone-actions">
          <a className="om-btn" href={`tel:${shown}`} onClick={() => track('mover_call', { mover: slug })}><Phone size={18} aria-hidden /> חיוג</a>
          <a className="om-btn wa" href={`https://wa.me/${intl}?text=${hi}`} target="_blank" rel="noreferrer" onClick={() => track('mover_whatsapp', { mover: slug })}><MessageCircle size={18} aria-hidden /> וואטסאפ</a>
        </div>
        <p className="om-consent" style={{ marginTop: 10 }}>ספרו להם שהגעתם דרך MoveMatch.</p>
      </div>
    );
  }

  if (!open) {
    return <button type="button" className="om-btn" onClick={() => { setOpen(true); track('mover_phone_click', { mover: slug }); }}><Phone size={18} aria-hidden /> הצגת מספר הטלפון</button>;
  }

  return (
    <form className="om-form" onSubmit={submit} noValidate>
      <label>השם שלכם<input name="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required autoFocus /></label>
      <label>הנייד שלכם<input name="phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" placeholder="050-1234567" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={16} required /></label>
      {err && <p className="om-err" role="alert">{ERR[err]}</p>}
      <button className="om-btn" type="submit" disabled={busy}>{busy ? 'רגע…' : 'הצגת המספר'}</button>
      <p className="om-consent">השם והנייד נשמרים אצלנו כדי לדעת שהגעתם ל{company} דרך MoveMatch. לא נשלח לכם הודעות בעקבות זה. <a href="/privacy" target="_blank">מדיניות הפרטיות</a></p>
    </form>
  );
}
