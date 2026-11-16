'use client';
import { CircleCheck } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Corners, Spinner } from './ui';
import { LogoInput } from './LogoInput';
import { AreaPicker } from './AreaPicker';

const ERR: Record<string, string> = {
  company: 'נא למלא את שם החברה.',
  phone: 'מספר הטלפון לא תקין. כתבו אותו כמו 0501234567.',
  url: 'קישור לא תקין. העתיקו את הכתובת המלאה של העמוד, שמתחילה ב-https://',
  areas: 'נא לבחור לפחות אזור שירות אחד. לפי האזורים נשלח לכם רק מכרזים שרלוונטיים לכם.',
  consent: 'צריך לאשר קבלת הודעות וואטסאפ והצגת הפרטים כדי להירשם.',
  terms: 'צריך לאשר את הסכם המובילים, כולל העמלה, כדי להירשם.',
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
    setErr('');
    const body = new FormData(e.currentTarget);
    if (!body.getAll('areas').length) { setErr(ERR.areas); document.getElementById('j-areas-0')?.focus(); return; }
    setBusy(true);
    try {
      const r = await fetch('/api/movers/signup', { method: 'POST', body });
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
      <div className="bid-row">
        <div className="field"><label htmlFor="j-grating">דירוג ב-Google (כוכבים, עד 5)</label><input id="j-grating" name="google_rating" className="input" inputMode="decimal" dir="ltr" placeholder="4.8" /></div>
        <div className="field"><label htmlFor="j-greviews">מספר הביקורות ב-Google</label><input id="j-greviews" name="google_reviews" className="input" inputMode="numeric" dir="ltr" placeholder="127" /></div>
      </div>
      <div className="field"><label htmlFor="j-midrag">קישור לפרופיל במדרג</label><input id="j-midrag" name="midrag_url" className="input" dir="ltr" placeholder="https://www.midrag.co.il/..." /></div>
      <div className="bid-row">
        <div className="field"><label htmlFor="j-mrating">ציון במדרג (עד 10)</label><input id="j-mrating" name="midrag_rating" className="input" inputMode="decimal" dir="ltr" placeholder="9.6" /></div>
        <div className="field"><label htmlFor="j-mreviews">מספר חוות הדעת במדרג</label><input id="j-mreviews" name="midrag_reviews" className="input" inputMode="numeric" dir="ltr" placeholder="85" /></div>
      </div>
      <div className="field"><label htmlFor="j-facebook">קישור לעמוד העסק בפייסבוק</label><input id="j-facebook" name="facebook_url" className="input" dir="ltr" placeholder="https://www.facebook.com/..." /></div>
      <div className="bid-row">
        <div className="field"><label htmlFor="j-frec">אחוז הממליצים בפייסבוק (עד 100)</label><input id="j-frec" name="facebook_recommend" className="input" inputMode="numeric" dir="ltr" placeholder="98" /></div>
        <div className="field"><label htmlFor="j-freviews">מספר הביקורות בפייסבוק</label><input id="j-freviews" name="facebook_reviews" className="input" inputMode="numeric" dir="ltr" placeholder="150" /></div>
      </div>
      <p className="small muted" style={{ margin: 0 }}>מלאו רק את הדירוגים שיש לכם. הם יוצגו ללקוחות לצד ההצעות שלכם, אחרי שנאמת אותם מול הקישורים.</p>
      <AreaPicker idPrefix="j-areas" legend="אזורי שירות * (חובה, אפשר לבחור כמה)" errorId={err === ERR.areas ? 'j-err' : undefined} />
      <p className="small muted" style={{ margin: '-6px 0 0' }}>תקבלו מכרזים רק של הובלות שיוצאות מהאזורים שבחרתם.</p>
      <div className="field"><label htmlFor="j-note">סוג משאית, מספר עובדים, הערות (לא חובה)</label><textarea id="j-note" name="note" className="input" rows={3} placeholder="למשל: משאית 12 טון, 4 עובדים, מנוף" /></div>
      <label className="check-row" style={{ alignItems: 'flex-start' }}>
        <input type="checkbox" name="consent" value="1" required />
        <span className="check-box" aria-hidden />
        <span className="small">אני מאשר/ת קבלת הודעות וואטסאפ על מכרזי הובלה חדשים, ושהפרטים, הלוגו והדירוגים שלי יוצגו ללקוחות לצד הצעות המחיר שאגיש. אפשר להפסיק בכל עת במענה &quot;הסר&quot;. <a href="/privacy" target="_blank">מדיניות הפרטיות</a></span>
      </label>
      <label className="check-row terms-key" style={{ alignItems: 'flex-start' }}>
        <input type="checkbox" name="terms" value="1" required />
        <span className="check-box" aria-hidden />
        <span className="small">קראתי ואני מאשר/ת את הסכם המובילים של MoveMatch, ובכלל זה: <b>תשלום עמלה של 10% מהמחיר הסופי (בתוספת מע״מ) על כל הובלה שאבצע ללקוח שהגיע דרך MoveMatch</b>. <a href="/movers/terms" target="_blank">לתנאים המלאים לחצו כאן</a></span>
      </label>
      <input name="website" className="visually-hidden" tabIndex={-1} autoComplete="off" aria-hidden />
      <button type="submit" className="btn btn-primary btn-lg blueprint" disabled={busy} aria-busy={busy}><Corners />{busy && <Spinner />} שליחת פרטים</button>
      {err && <div className="field-error" id="j-err" role="alert">{err}</div>}
    </form>
  );
}
