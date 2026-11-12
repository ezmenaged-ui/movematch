'use client';
import { CircleCheck } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Corners, Spinner } from './ui';
import { LogoInput } from './LogoInput';

const ERR: Record<string, string> = {
  company: 'נא למלא את שם החברה.',
  phone: 'מספר הטלפון לא תקין. כתבו אותו כמו 0501234567.',
  url: 'קישור לא תקין. העתיקו את הכתובת המלאה של העמוד, שמתחילה ב-https://',
  consent: 'צריך לאשר את התנאים כדי להירשם.',
  logotype: 'הלוגו צריך להיות קובץ PNG, JPG או WEBP.',
  logosize: 'קובץ הלוגו גדול מדי. עד 400KB.',
  exists: 'המספר הזה כבר רשום אצלנו. אם צריך לעדכן פרטים, כתבו לנו בוואטסאפ.',
  'too many': 'יש כרגע עומס בהרשמות. נסו שוב מחר.',
};

export function MoverSignupForm() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const r = await fetch('/api/movers/signup', { method: 'POST', body: new FormData(e.currentTarget) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(ERR[j.error] || 'משהו השתבש. נסו שוב בעוד רגע.'); return; }
      setDone(true); window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch { setErr('משהו השתבש. נסו שוב בעוד רגע.'); } finally { setBusy(false); }
  }

  if (done) return (
    <div className="bid-done" role="status">
      <CircleCheck size={28} strokeWidth={1.5} />
      <div><b>תודה! הפרטים התקבלו.</b><p className="muted" style={{ margin: '4px 0 0' }}>נבדוק אותם ונעדכן אתכם בוואטסאפ ברגע שתתחילו לקבל מכרזים.</p></div>
    </div>
  );

  return (
    <form className="bid-form" onSubmit={submit} noValidate>
      <div className="bid-row">
        <div className="field"><label htmlFor="j-company">שם החברה *</label><input id="j-company" name="company" className="input" required autoComplete="organization" placeholder="הובלות דוד בע״מ" /></div>
        <div className="field"><label htmlFor="j-name">שם איש הקשר</label><input id="j-name" name="name" className="input" autoComplete="name" placeholder="דוד כהן" /></div>
      </div>
      <div className="bid-row">
        <div className="field"><label htmlFor="j-phone">טלפון (וואטסאפ) *</label><input id="j-phone" name="phone" className="input" type="tel" inputMode="tel" autoComplete="tel" required dir="ltr" placeholder="050-0000000" /></div>
        <div className="field"><label htmlFor="j-email">אימייל</label><input id="j-email" name="email" className="input" type="email" autoComplete="email" dir="ltr" placeholder="name@company.co.il" /></div>
      </div>
      <div className="field"><label htmlFor="j-logo">לוגו החברה (PNG/JPG)</label><LogoInput id="j-logo" /></div>
      <div className="field"><label htmlFor="j-google">קישור לעמוד העסק ב-Google</label><input id="j-google" name="google_url" className="input" dir="ltr" placeholder="https://maps.app.goo.gl/..." /></div>
      <div className="field"><label htmlFor="j-midrag">קישור לפרופיל במדרג</label><input id="j-midrag" name="midrag_url" className="input" dir="ltr" placeholder="https://www.midrag.co.il/..." /></div>
      <div className="field"><label htmlFor="j-note">אזורי שירות, סוג משאית, מספר עובדים (לא חובה)</label><textarea id="j-note" name="note" className="input" rows={3} placeholder="למשל: מרכז והשרון, משאית 12 טון, 4 עובדים, מנוף" /></div>
      <label className="check-row" style={{ alignItems: 'flex-start' }}>
        <input type="checkbox" name="consent" value="1" required />
        <span className="check-box" aria-hidden />
        <span className="small">אני מאשר/ת קבלת הודעות וואטסאפ על מכרזי הובלה חדשים, ושהפרטים, הלוגו והדירוגים שלי יוצגו ללקוחות לצד הצעות המחיר שאגיש. אפשר להפסיק בכל עת במענה &quot;הסר&quot;. <a href="/terms" target="_blank">תנאי השימוש</a> · <a href="/privacy" target="_blank">מדיניות הפרטיות</a></span>
      </label>
      <input name="website" className="visually-hidden" tabIndex={-1} autoComplete="off" aria-hidden />
      <button type="submit" className="btn btn-primary btn-lg blueprint" disabled={busy} aria-busy={busy}><Corners />{busy && <Spinner />} שליחת פרטים</button>
      {err && <div className="field-error" role="alert">{err}</div>}
    </form>
  );
}
