import Link from 'next/link';
import { MoverAuthCard, Note } from '@/components/MoverAuthCard';
import { resetPassword } from '../actions';

export const metadata = { title: 'סיסמה חדשה · MoveMatch', robots: { index: false, follow: false } };

const ERR: Record<string, string> = { short: 'הסיסמה צריכה להיות באורך 8 תווים לפחות.', match: 'הסיסמאות לא תואמות.', token: 'הקישור פג או כבר נוצל. בקשו קישור חדש.', fail: 'לא הצלחנו לשמור. נסו שוב.' };

export default async function MoverReset({ searchParams }: { searchParams: Promise<{ t?: string; error?: string }> }) {
  const sp = await searchParams;
  const t = /^[0-9a-f]{64}$/.test(sp.t || '') ? sp.t! : '';
  return (
    <MoverAuthCard title="בחירת סיסמה חדשה" sub="בחרו סיסמה באורך 8 תווים לפחות.">
      {!t || sp.error === 'token' ? <div style={{ marginTop: 18 }}><Note kind="warn">{ERR.token}</Note></div> : (
        <form action={resetPassword}>
          <input type="hidden" name="t" value={t} />
          {sp.error && <Note kind="warn">{ERR[sp.error] || ERR.fail}</Note>}
          <div className="field"><label htmlFor="p1">סיסמה חדשה</label><input id="p1" name="password" type="password" minLength={8} className="input" autoComplete="new-password" required dir="ltr" autoFocus /></div>
          <div className="field"><label htmlFor="p2">אימות הסיסמה</label><input id="p2" name="password2" type="password" minLength={8} className="input" autoComplete="new-password" required dir="ltr" /></div>
          <button type="submit" className="btn btn-primary">שמירת סיסמה</button>
        </form>
      )}
      <div className="mv-auth-links"><Link href="/movers/forgot">בקשת קישור חדש</Link><Link href="/movers/login">חזרה לכניסה</Link></div>
    </MoverAuthCard>
  );
}
