import { MoverAuthCard, Note } from '@/components/MoverAuthCard';
import { requireMe } from '@/lib/mover';
import { changePassword } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'בחירת סיסמה · MoveMatch', robots: { index: false, follow: false } };

const ERR: Record<string, string> = {
  short: 'הסיסמה צריכה להיות באורך 8 תווים לפחות.', match: 'הסיסמאות לא תואמות.', same: 'בחרו סיסמה שונה מהסיסמה הראשונית.',
  weak: 'הסיסמה חלשה מדי. נסו סיסמה ארוכה יותר.', fail: 'לא הצלחנו לשמור. נסו שוב.',
};

export default async function MoverPassword({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const me = await requireMe({ allowPasswordChange: true });
  return (
    <MoverAuthCard title={me.must_change_password ? `ברוכים הבאים${me.name ? `, ${me.name.split(' ')[0]}` : ''}` : 'שינוי סיסמה'}
      sub={me.must_change_password ? 'לפני שמתחילים, בחרו סיסמה אישית במקום הסיסמה הראשונית שקיבלתם.' : 'בחרו סיסמה חדשה לחשבון.'}>
      <form action={changePassword}>
        {error && <Note kind="warn">{ERR[error] || ERR.fail}</Note>}
        <input type="email" name="username" autoComplete="username" value={me.email || ''} readOnly hidden />
        <div className="field"><label htmlFor="p1">סיסמה חדשה (8 תווים לפחות)</label><input id="p1" name="password" type="password" minLength={8} className="input" autoComplete="new-password" required dir="ltr" autoFocus /></div>
        <div className="field"><label htmlFor="p2">אימות הסיסמה</label><input id="p2" name="password2" type="password" minLength={8} className="input" autoComplete="new-password" required dir="ltr" /></div>
        <button type="submit" className="btn btn-primary">שמירת סיסמה</button>
      </form>
    </MoverAuthCard>
  );
}
