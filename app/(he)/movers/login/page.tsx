import Link from 'next/link';
import { MoverAuthCard, Note } from '@/components/MoverAuthCard';
import { login } from '../actions';

export const metadata = { title: 'כניסה · סביבת מובילים · MoveMatch', robots: { index: false, follow: false } };

export default async function MoverLogin({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; email?: string; reset?: string; out?: string }> }) {
  const sp = await searchParams;
  return (
    <MoverAuthCard title="כניסה לסביבת המובילים" sub="הזינו את כתובת הדוא״ל והסיסמה שקיבלתם מ-MoveMatch.">
      <form action={login}>
        <input type="hidden" name="next" value={sp.next || '/movers'} />
        {sp.error === '1' && <Note kind="warn">כתובת הדוא״ל או הסיסמה שגויות.</Note>}
        {sp.error === 'access' && <Note kind="warn">לחשבון הזה אין גישה לסביבת המובילים. פנו ל-MoveMatch.</Note>}
        {sp.reset && <Note kind="ok">הסיסמה עודכנה. אפשר להיכנס עם הסיסמה החדשה.</Note>}
        {sp.out && <Note kind="ok">יצאתם מהחשבון.</Note>}
        <div className="field"><label htmlFor="em">דוא״ל</label><input id="em" name="email" type="email" className="input" autoComplete="email" required dir="ltr" defaultValue={sp.email || ''} autoFocus={!sp.email} /></div>
        <div className="field"><label htmlFor="pw">סיסמה</label><input id="pw" name="password" type="password" className="input" autoComplete="current-password" required dir="ltr" autoFocus={!!sp.email} /></div>
        <button type="submit" className="btn btn-primary">כניסה</button>
      </form>
      <div className="mv-auth-links"><Link href="/movers/forgot">שכחתם סיסמה?</Link></div>
    </MoverAuthCard>
  );
}
