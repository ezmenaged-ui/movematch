import Link from 'next/link';
import { MoverAuthCard, Note } from '@/components/MoverAuthCard';
import { requestOtp, verifyOtp } from '../actions';

export const metadata = { title: 'כניסה עם קוד בטלפון · סביבת מובילים · MoveMatch', robots: { index: false, follow: false } };

/** Phone + SMS code login (movers without email). Step 1: phone. Step 2 (?sent=1): the 6-digit code. */
export default async function MoverPhoneLogin({ searchParams }: { searchParams: Promise<{ p?: string; sent?: string; error?: string; next?: string }> }) {
  const sp = await searchParams;
  const next = sp.next || '/movers';
  const phone = (sp.p || '').replace(/\D/g, '').slice(0, 10);
  return (
    <MoverAuthCard title="כניסה עם קוד בטלפון" sub={sp.sent ? 'שלחנו קוד בן 6 ספרות ב-SMS. הקוד בתוקף ל-10 דקות.' : 'הזינו את מספר הטלפון הרשום אצלנו ונשלח אליו קוד כניסה ב-SMS.'}>
      {sp.sent && phone ? (
        <>
          <form action={verifyOtp}>
            <input type="hidden" name="phone" value={phone} />
            <input type="hidden" name="next" value={next} />
            {sp.error === 'code' && <Note kind="warn">הקוד שגוי או שפג תוקפו. נסו שוב או בקשו קוד חדש.</Note>}
            {sp.error === 'wait' && <Note kind="warn">כבר נשלח קוד לפני רגע. השתמשו בו, או חכו דקה ובקשו חדש.</Note>}
            <p className="small muted" style={{ margin: '12px 0 0' }}>אם המספר <span dir="ltr">{phone}</span> רשום אצלנו, הקוד בדרך.</p>
            <div className="field"><label htmlFor="code">קוד מה-SMS</label>
              <input id="code" name="code" className="input" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required dir="ltr" autoFocus /></div>
            <button type="submit" className="btn btn-primary">כניסה</button>
          </form>
          <form action={requestOtp} style={{ marginTop: 10 }}>
            <input type="hidden" name="phone" value={phone} />
            <input type="hidden" name="next" value={next} />
            <button type="submit" className="btn btn-secondary">שליחת קוד חדש</button>
          </form>
        </>
      ) : (
        <form action={requestOtp}>
          <input type="hidden" name="next" value={next} />
          {sp.error === 'phone' && <Note kind="warn">מספר הטלפון לא תקין. כתבו אותו כמו 0501234567.</Note>}
          {sp.error === 'send' && <Note kind="warn">שליחת ה-SMS נכשלה. נסו שוב בעוד כמה דקות או פנו ל-MoveMatch.</Note>}
          <div className="field"><label htmlFor="ph">טלפון</label>
            <input id="ph" name="phone" type="tel" className="input" inputMode="tel" autoComplete="tel" placeholder="0501234567" required dir="ltr" defaultValue={phone} autoFocus /></div>
          <button type="submit" className="btn btn-primary">שליחת קוד</button>
        </form>
      )}
      <div className="mv-auth-links"><Link href="/movers/login">כניסה עם דוא״ל וסיסמה</Link></div>
    </MoverAuthCard>
  );
}
