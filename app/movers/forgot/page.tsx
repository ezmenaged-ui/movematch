import Link from 'next/link';
import { MoverAuthCard, Note } from '@/components/MoverAuthCard';
import { forgotPassword } from '../actions';

export const metadata = { title: 'איפוס סיסמה · MoveMatch', robots: { index: false, follow: false } };

export default async function MoverForgot({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const sp = await searchParams;
  return (
    <MoverAuthCard title="איפוס סיסמה" sub="הזינו את כתובת הדוא״ל של החשבון ונשלח קישור לבחירת סיסמה חדשה.">
      {sp.sent ? <div style={{ marginTop: 18 }}><Note kind="ok">אם הכתובת רשומה אצלנו, נשלח אליה קישור לאיפוס. הקישור בתוקף לשעה. לא הגיע? בדקו בספאם או פנו ל-MoveMatch.</Note></div> : (
        <form action={forgotPassword}>
          {sp.error && <Note kind="warn">שליחת הדוא״ל נכשלה. נסו שוב בעוד כמה דקות או פנו ל-MoveMatch.</Note>}
          <div className="field"><label htmlFor="em">דוא״ל</label><input id="em" name="email" type="email" className="input" autoComplete="email" required dir="ltr" autoFocus /></div>
          <button type="submit" className="btn btn-primary">שליחת קישור לאיפוס</button>
        </form>
      )}
      <div className="mv-auth-links"><Link href="/movers/login">חזרה לכניסה</Link></div>
    </MoverAuthCard>
  );
}
