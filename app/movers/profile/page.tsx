import { AdminHero } from '@/components/AdminShell';
import { MoverShell } from '@/components/MoverShell';
import { MoverLogo } from '@/components/MoverLogo';
import { requireMe } from '@/lib/mover';
import { saveProfile } from '../actions';
import Link from 'next/link';
import { LogoInput } from '@/components/LogoInput';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'פרופיל עסקי · סביבת מובילים', robots: { index: false, follow: false } };

const ERR: Record<string, string> = {
  company: 'חסר שם מסחרי. הוא מופיע ללקוחות על ההצעות.',
  logotype: 'הלוגו צריך להיות PNG, JPG או WEBP.', logosize: 'קובץ הלוגו גדול מדי (עד 400KB).', db: 'השמירה נכשלה. נסו שוב.',
};

function F({ id, label, name, value, type = 'text', wide, ...rest }: { id: string; label: string; name: string; value?: string | null; type?: string; wide?: boolean } & Record<string, unknown>) {
  return <div className={`field ${wide ? 'wide' : ''}`}><label htmlFor={id}>{label}</label><input id={id} name={name} type={type} className="input" defaultValue={value || ''} {...rest} /></div>;
}

export default async function Profile({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const me = await requireMe();
  const company = me.company_name || me.name;
  return (
    <MoverShell me={me} active="profile" title="פרופיל עסקי">
      <AdminHero kicker="העסק שלי" title="פרופיל עסקי" sub="השם והלוגו מופיעים ללקוחות על ההצעות שלכם." />
      {sp.ok && <p className="mv-note ok" role="status">הפרופיל נשמר.</p>}
      {sp.error && <p className="mv-note warn" role="alert">{ERR[sp.error] || ERR.db}</p>}
      <form action={saveProfile} className="mv-card">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><MoverLogo id={me.id} hasLogo={me.has_logo} name={company} size={56} /><h2 style={{ margin: 0 }}>מיתוג</h2></div>
        <div className="mv-fields">
          <F id="co" label="שם מסחרי (מופיע ללקוח)" name="company" value={me.company_name} required maxLength={120} />
          <F id="nm" label="שם איש הקשר" name="name" value={me.name} maxLength={120} />
          <div className="field"><label htmlFor="lg">{me.has_logo ? 'החלפת לוגו' : 'לוגו'} (PNG/JPG/WEBP)</label><LogoInput id="lg" /></div>
          {me.has_logo && <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'end' }}><input type="checkbox" name="remove_logo" /> הסרת הלוגו</label>}
        </div>

        <button type="submit" className="btn btn-primary">שמירת פרופיל</button>
      </form>

      <div className="mv-card">
        <h2>פרטים שמנוהלים על ידי MoveMatch</h2>
        <dl className="mv-dl" style={{ gridTemplateColumns: '150px 1fr' }}>
          <dt>טלפון (וואטסאפ)</dt><dd dir="ltr" style={{ textAlign: 'right' }}>{me.phone}</dd>
          <dt>דוא״ל לכניסה</dt><dd dir="ltr" style={{ textAlign: 'right' }}>{me.email}</dd>
          <dt>דירוג Google</dt><dd>{me.google_rating !== null ? `★ ${Number(me.google_rating).toFixed(1)}${me.google_reviews ? ` (${me.google_reviews} ביקורות)` : ''}` : '—'}</dd>
          <dt>דירוג מדרג</dt><dd>{me.midrag_rating !== null ? `★ ${Number(me.midrag_rating).toFixed(1)}${me.midrag_reviews ? ` (${me.midrag_reviews} ביקורות)` : ''}` : '—'}</dd>
          <dt>פייסבוק</dt><dd>{me.facebook_recommend !== null ? `👍 ${me.facebook_recommend}% ממליצים${me.facebook_reviews ? ` (${me.facebook_reviews} ביקורות)` : ''}` : '—'}{me.facebook_url && <> · <a href={me.facebook_url} target="_blank" rel="noreferrer">לעמוד</a></>}</dd>
          <dt>התראות וואטסאפ</dt><dd>{me.active ? 'פעילות' : 'מושהות'}</dd>
        </dl>
        <p className="mv-meta" style={{ margin: '10px 0 0' }}>לשינוי הטלפון, הדוא״ל או הדירוגים פנו ל-MoveMatch.</p>
        <div className="mv-actions"><Link className="btn btn-secondary" href="/movers/password">שינוי סיסמה</Link></div>
      </div>
    </MoverShell>
  );
}
