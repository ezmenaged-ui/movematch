import { Blueprint, Corners, Header } from '@/components/ui';

export const metadata = { title: 'כניסה · MoveMatch', robots: { index: false } };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  return (
    <>
      <Header />
      <main className="wiz">
        <Blueprint className="wiz-card">
          <h2>כניסה ללידים</h2>
          <p className="muted">נכנסים פעם אחת, והמכשיר הזה יזכור אתכם ל־6 חודשים.</p>
          <form method="post" action="/api/login" className="stack" style={{ marginTop: 18 }}>
            <input type="hidden" name="next" value={sp.next || '/admin'} />
            <div className="field">
              <label htmlFor="pw">סיסמה</label>
              <input id="pw" name="password" type="password" className="input" autoComplete="current-password" autoFocus required dir="ltr" aria-invalid={sp.error ? 'true' : undefined} />
              {sp.error && <div className="field-error" role="alert">סיסמה שגויה</div>}
            </div>
            <button type="submit" className="btn btn-primary btn-lg blueprint" style={{ alignSelf: 'flex-start' }}><Corners />כניסה</button>
          </form>
        </Blueprint>
      </main>
    </>
  );
}
