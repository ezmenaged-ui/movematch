import { AdminHero, AdminShell, StatCard } from '@/components/AdminShell';
import { CircleCheck, MessageCircle, Truck, UserPlus } from 'lucide-react';
import { db } from '@/lib/db';
import { waEnabled } from '@/lib/whatsapp';
import { messagesPaused } from '@/lib/pause';
import { MoverLogo } from '@/components/MoverLogo';
import { approveMover, clearMoverLogo, deleteMover, revokeMoverLogin, saveMover, setMoverActive, setMoverAreas, setMoverLogin, testMover } from '../actions';
import { MoverLoginForm } from '@/components/MoverLoginForm';
import { CopyButton } from '@/components/CopyButton';
import { siteUrl } from '@/lib/notify';
import { LogoInput } from '@/components/LogoInput';
import { AreaPicker } from '@/components/AreaPicker';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Movers · MoveMatch', robots: { index: false } };

type Mover = { id: string; name: string; company_name: string; phone: string; active: boolean; created_at: string; opted_out_at: string | null; has_logo: boolean;
  status: 'pending' | 'approved'; email: string | null; signup_note: string | null; auth_user_id: string | null; must_change_password: boolean;
  google_url: string | null; google_rating: number | null; google_reviews: number | null; midrag_url: string | null; midrag_rating: number | null; midrag_reviews: number | null;
  facebook_url: string | null; facebook_recommend: number | null; facebook_reviews: number | null };
const MSG: Record<string, string> = {
  phone: 'מספר הטלפון לא תקין. כתבו אותו כמו 0501234567.',
  company: 'חסר שם חברה. הוא מופיע ללקוח על ההצעה.',
  logotype: 'הלוגו צריך להיות קובץ PNG, JPG או WEBP.',
  logosize: 'קובץ הלוגו גדול מדי. עד 400KB.',
  url: 'קישור לא תקין. העתיקו את הכתובת המלאה, שמתחילה ב-https://',
  db: 'השמירה נכשלה. נסו שוב.',
  send: 'שליחת הודעת הבדיקה נכשלה. בדקו שהגדרות Twilio הושלמו.',
  email: 'כתובת דוא״ל לא תקינה.', pw: 'הסיסמה הראשונית צריכה להיות באורך 8 תווים לפחות.', emailused: 'כתובת הדוא״ל כבר משויכת למוביל אחר.', mail: 'הגישה נשמרה, אבל שליחת המייל נכשלה. העתיקו את ההודעה ושלחו ידנית, או נסו שוב (הסיסמה תתחלף).',
};

/** Area tags + an editor. Leads go only to movers whose areas include the lead's origin area. */
function MoverAreas({ m, areas }: { m: Mover; areas: string[] }) {
  return (
    <details style={{ marginTop: 8 }}>
      <summary className="small" style={{ cursor: 'pointer', color: 'var(--color-accent-700)', fontWeight: 600 }}>
        אזורי שירות: {areas.length ? areas.join(' · ') : <span className="adm-tag warn">לא נבחרו, לא יקבל מכרזים</span>}
      </summary>
      <form action={setMoverAreas} style={{ marginTop: 10, display: 'grid', gap: 10 }}>
        <input type="hidden" name="id" value={m.id} />
        <AreaPicker idPrefix={`ar-${m.id}`} selected={areas} legend="אזורי שירות (מכרזים נשלחים לפי אזור המוצא של ההובלה)" />
        <button className="btn btn-primary adm-btn" type="submit" style={{ justifySelf: 'start' }}>שמירת אזורים</button>
      </form>
    </details>
  );
}

function MoverFields({ m }: { m?: Mover }) {
  const k = m?.id || 'new';
  return (
    <>
      {m && <input type="hidden" name="id" value={m.id} />}
      <div className="field" style={{ margin: 0 }}><label htmlFor={`co-${k}`}>שם החברה (מופיע ללקוח)</label><input id={`co-${k}`} name="company" className="input" placeholder="הובלות דוד בע״מ" defaultValue={m?.company_name} required /></div>
      <div className="field" style={{ margin: 0 }}><label htmlFor={`nm-${k}`}>שם איש הקשר</label><input id={`nm-${k}`} name="name" className="input" placeholder="דוד" defaultValue={m?.name} /></div>
      <div className="field" style={{ margin: 0 }}><label htmlFor={`ph-${k}`}>טלפון (וואטסאפ)</label><input id={`ph-${k}`} name="phone" className="input" placeholder="0501234567" dir="ltr" inputMode="tel" defaultValue={m?.phone} required /></div>
      <div className="field" style={{ margin: 0 }}><label htmlFor={`gu-${k}`}>קישור לעמוד Google</label><input id={`gu-${k}`} name="google_url" className="input" dir="ltr" placeholder="https://maps.app.goo.gl/..." defaultValue={m?.google_url || ''} /></div>
      <div className="field" style={{ margin: 0 }}><label htmlFor={`gr-${k}`}>דירוג Google (מתוך 5)</label><input id={`gr-${k}`} name="google_rating" className="input" dir="ltr" inputMode="decimal" placeholder="4.8" defaultValue={m?.google_rating ?? ''} /></div>
      <div className="field" style={{ margin: 0 }}><label htmlFor={`gn-${k}`}>מספר ביקורות Google</label><input id={`gn-${k}`} name="google_reviews" className="input" dir="ltr" inputMode="numeric" placeholder="120" defaultValue={m?.google_reviews ?? ''} /></div>
      <div className="field" style={{ margin: 0 }}><label htmlFor={`mu-${k}`}>קישור לעמוד במדרג</label><input id={`mu-${k}`} name="midrag_url" className="input" dir="ltr" placeholder="https://www.midrag.co.il/..." defaultValue={m?.midrag_url || ''} /></div>
      <div className="field" style={{ margin: 0 }}><label htmlFor={`mr-${k}`}>דירוג מדרג (מתוך 10)</label><input id={`mr-${k}`} name="midrag_rating" className="input" dir="ltr" inputMode="decimal" placeholder="9.4" defaultValue={m?.midrag_rating ?? ''} /></div>
      <div className="field" style={{ margin: 0 }}><label htmlFor={`mn-${k}`}>מספר ביקורות מדרג</label><input id={`mn-${k}`} name="midrag_reviews" className="input" dir="ltr" inputMode="numeric" placeholder="85" defaultValue={m?.midrag_reviews ?? ''} /></div>
      <div className="field" style={{ margin: 0 }}><label htmlFor={`fu-${k}`}>קישור לעמוד פייסבוק</label><input id={`fu-${k}`} name="facebook_url" className="input" dir="ltr" placeholder="https://www.facebook.com/..." defaultValue={m?.facebook_url || ''} /></div>
      <div className="field" style={{ margin: 0 }}><label htmlFor={`fr-${k}`}>פייסבוק: % ממליצים</label><input id={`fr-${k}`} name="facebook_recommend" className="input" dir="ltr" inputMode="numeric" placeholder="100" defaultValue={m?.facebook_recommend ?? ''} /></div>
      <div className="field" style={{ margin: 0 }}><label htmlFor={`fn-${k}`}>מספר ביקורות פייסבוק</label><input id={`fn-${k}`} name="facebook_reviews" className="input" dir="ltr" inputMode="numeric" placeholder="150" defaultValue={m?.facebook_reviews ?? ''} /></div>
      <div className="field" style={{ margin: 0 }}><label htmlFor={`lg-${k}`}>{m?.has_logo ? 'החלפת לוגו' : 'לוגו'} (PNG/JPG)</label><LogoInput id={`lg-${k}`} /></div>
    </>
  );
}

export default async function Movers({ searchParams }: { searchParams: Promise<{ err?: string; ok?: string; to?: string }> }) {
  const { err, ok, to } = await searchParams;
  const [{ data, error }, ar] = await Promise.all([
    db().rpc('mm_admin_movers', { p_secret: process.env.MM_ADMIN_SECRET }),
    db().rpc('mm_admin_mover_areas', { p_secret: process.env.MM_ADMIN_SECRET }),
  ]);
  if (error) return <main style={{ padding: 24 }}>שגיאה: {error.message}</main>;
  const areasOf = new Map(((ar.data || []) as { mover_id: string; areas: string[] }[]).map((r) => [r.mover_id, r.areas]));
  const all = (data || []) as Mover[];
  const pending = all.filter((m) => m.status === 'pending');
  const movers = all.filter((m) => m.status !== 'pending');
  const active = movers.filter((m) => m.active).length;
  const joinLink = `${siteUrl() || ''}/movers/join`;
  const panelUrl = `${siteUrl() || ''}/movers/login`;

  return (
    <AdminShell active="movers" title="מובילים" counts={{ movers: movers.length, pending: pending.length }}>
      <AdminHero kicker="סביבת מובילים" title="מובילים" sub="המובילים שמקבלים מכרזים בוואטסאפ, הפרופילים שלהם והרשמות חדשות לאישור." />
      <div className="mmx-stats">
        <StatCard icon={<Truck size={20} />} n={movers.length} label="מובילים ברשימה" />
        <StatCard icon={<CircleCheck size={20} />} n={active} label="פעילים" />
        <StatCard icon={<UserPlus size={20} />} n={pending.length} label="ממתינים לאישור" />
      </div>
      {messagesPaused() && <p className="adm-tag warn" style={{ display: 'inline-block', padding: '6px 10px' }}>⏸️ שליחת הודעות מושהית (MESSAGES_PAUSED): לא נשלחים וואטסאפ, SMS ומיילים.</p>}
      {!waEnabled() && !messagesPaused() && <p className="adm-tag warn" style={{ display: 'inline-block', padding: '6px 10px' }}>וואטסאפ עדיין לא מחובר (חסרות הגדרות Twilio). אפשר כבר להוסיף מובילים.</p>}
      {ar.error && <p className="adm-tag warn" style={{ display: 'block', padding: '6px 10px' }}>אזורי השירות לא נטענו: צריך להריץ את מיגרציה 013 (supabase/migrations/013_mover_service_areas.sql). עד אז מכרזים לא יישלחו למובילים.</p>}
      {err && <p className="adm-tag warn" style={{ display: 'block', padding: '6px 10px' }}>{MSG[err] || 'שגיאה'}</p>}
      {ok && <p className="adm-tag ok" style={{ display: 'block', padding: '6px 10px' }}>{ok === 'test' ? 'הודעת בדיקה נשלחה.' : ok === 'login' ? 'הגישה נשמרה וההודעה הועתקה. הדביקו ושלחו אותה למוביל כמו שהיא (אל תעתיקו שוב מהכרטיס: זו תהיה סיסמה אחרת).' : ok === 'sent' ? `הגישה נשמרה ונשלח מייל עם פרטי הכניסה${to ? ` אל ${to}` : ''}.` : 'נשמר.'}</p>}

      <div className="adm-box" style={{ margin: '14px 0' }}>
        <h4>קישור הרשמה למובילים</h4>
        <p className="small muted" style={{ margin: '0 0 8px' }}>שלחו את הקישור למובילים. הם ממלאים שם חברה, לוגו, טלפון, אזורי שירות ופרופילי Google ומדרג, והפרטים מופיעים כאן לאישור.</p>
        <div className="adm-link"><a href={joinLink} target="_blank" rel="noreferrer" dir="ltr">{joinLink}</a></div>
        <div className="adm-actions"><CopyButton text={joinLink} label="העתקת קישור" /></div>
      </div>

      {pending.length > 0 && (
        <div id="pending" className="adm-box" style={{ margin: '14px 0', borderColor: '#e0a43a', background: '#fff6e5' }}>
          <h4>ממתינים לאישור ({pending.length})</h4>
          <p className="small muted" style={{ margin: '0 0 10px' }}>לפני האישור כדאי להיכנס לקישורים, ולהוסיף בעריכה את הדירוגים ומספר הביקורות מ-Google, ממדרג ומפייסבוק.</p>
          <div className="adm-bids">
            {pending.map((m) => (
              <div key={m.id} className="adm-bid">
                <div className="adm-bid-main" style={{ alignItems: 'center' }}>
                  <MoverLogo id={m.id} hasLogo={m.has_logo} name={m.company_name || m.name} size={40} />
                  <b>{m.company_name}</b><span>{m.name}</span><span dir="ltr">{m.phone}</span>
                  {m.email && <span dir="ltr">{m.email}</span>}
                  {m.google_url && <a className="adm-tag" href={m.google_url} target="_blank" rel="noreferrer">Google ↗</a>}
                  {m.midrag_url && <a className="adm-tag" href={m.midrag_url} target="_blank" rel="noreferrer">מדרג ↗</a>}
                  {m.facebook_url && <a className="adm-tag" href={m.facebook_url} target="_blank" rel="noreferrer">Facebook ↗</a>}
                  <span className="small muted">נרשם {new Date(m.created_at).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', dateStyle: 'short', timeStyle: 'short' })}</span>
                </div>
                {m.signup_note && <p className="small" style={{ margin: '6px 0 0' }}>“{m.signup_note}”</p>}
                <MoverAreas m={m} areas={areasOf.get(m.id) || []} />
                <div className="adm-actions">
                  <form action={approveMover.bind(null, m.id)}><button className="btn btn-primary adm-btn" type="submit">אישור והפעלה</button></form>
                  <form action={deleteMover.bind(null, m.id)}><button className="btn btn-secondary adm-btn" type="submit">דחייה ומחיקה</button></form>
                </div>
                <details style={{ marginTop: 8 }}>
                  <summary className="small" style={{ cursor: 'pointer', color: 'var(--color-accent-700)', fontWeight: 600 }}>עריכה והוספת דירוגים</summary>
                  <form action={saveMover} className="adm-mover-form" style={{ marginTop: 10 }}>
                    <MoverFields m={m} />
                    <button className="btn btn-primary adm-btn" type="submit">שמירה</button>
                  </form>
                </details>
              </div>
            ))}
          </div>
        </div>
      )}

      <form action={saveMover} className="adm-box adm-mover-form">
        <h4 style={{ gridColumn: '1 / -1' }}>הוספת מוביל</h4>
        <MoverFields />
        <button className="btn btn-primary adm-btn" type="submit">הוספת מוביל</button>
      </form>

      <h2 style={{ fontSize: 20 }}>{movers.length} מובילים · {active} פעילים</h2>
      <div className="adm-bids">
        {movers.length === 0 && <span className="muted">עוד אין מובילים ברשימה.</span>}
        {movers.map((m) => (
          <div key={m.id} className={`adm-bid ${m.active ? '' : 'hidden'}`}>
            <div className="adm-bid-main" style={{ alignItems: 'center' }}>
              <MoverLogo id={m.id} hasLogo={m.has_logo} name={m.company_name || m.name} size={40} />
              <b>{m.company_name || 'ללא שם חברה'}</b>
              <span>{m.name}</span>
              <span dir="ltr">{m.phone}</span>
              <span className={`adm-tag ${m.active ? 'ok' : 'warn'}`}>{m.active ? 'פעיל' : m.opted_out_at ? 'ביקש הסרה' : 'מושהה'}</span>
              {!m.has_logo && <span className="adm-tag warn">אין לוגו</span>}
              {m.google_rating !== null && <a className="adm-tag" href={m.google_url || undefined} target="_blank" rel="noreferrer">Google ★ {Number(m.google_rating).toFixed(1)}{m.google_reviews ? ` (${m.google_reviews})` : ''}</a>}
              {m.midrag_rating !== null && <a className="adm-tag" href={m.midrag_url || undefined} target="_blank" rel="noreferrer">מדרג ★ {Number(m.midrag_rating).toFixed(1)}{m.midrag_reviews ? ` (${m.midrag_reviews})` : ''}</a>}
              {m.facebook_recommend !== null && <a className="adm-tag" href={m.facebook_url || undefined} target="_blank" rel="noreferrer">Facebook 👍 {m.facebook_recommend}%{m.facebook_reviews ? ` (${m.facebook_reviews})` : ''}</a>}
              {m.google_rating === null && m.midrag_rating === null && m.facebook_recommend === null && <span className="adm-tag warn">אין דירוגים</span>}
              {m.auth_user_id ? <span className="adm-tag ok">גישה לפאנל{m.must_change_password ? ' · טרם נכנס' : ''}</span> : <span className="adm-tag">אין גישה לפאנל</span>}
            </div>
            <div className="adm-actions">
              <form action={setMoverActive.bind(null, m.id, !m.active)}><button className="btn btn-secondary adm-btn" type="submit">{m.active ? 'השהיה' : 'הפעלה'}</button></form>
              {waEnabled() && <form action={testMover.bind(null, m.phone)}><button className="btn btn-secondary adm-btn" type="submit"><MessageCircle size={14} /> הודעת בדיקה</button></form>}
              {m.has_logo && <form action={clearMoverLogo.bind(null, m.id)}><button className="btn btn-secondary adm-btn" type="submit">הסרת לוגו</button></form>}
              <form action={deleteMover.bind(null, m.id)}><button className="btn btn-secondary adm-btn" type="submit">מחיקה</button></form>
            </div>
            <MoverAreas m={m} areas={areasOf.get(m.id) || []} />
            <details style={{ marginTop: 8 }}>
              <summary className="small" style={{ cursor: 'pointer', color: 'var(--color-accent-700)', fontWeight: 600 }}>{m.auth_user_id ? `גישה לפאנל המובילים · ${m.email}` : 'פתיחת גישה לפאנל המובילים'}</summary>
              <MoverLoginForm id={m.id} email={m.email || ''} hasLogin={!!m.auth_user_id} panelUrl={panelUrl} firstName={m.name.split(' ')[0]} action={setMoverLogin} />
              {m.auth_user_id && <form action={revokeMoverLogin.bind(null, m.id)}><button className="btn btn-secondary adm-btn" type="submit">ביטול הגישה לפאנל</button></form>}
            </details>
            <details style={{ marginTop: 8 }}>
              <summary className="small" style={{ cursor: 'pointer', color: 'var(--color-accent-700)', fontWeight: 600 }}>עריכת פרטים</summary>
              <form action={saveMover} className="adm-mover-form" style={{ marginTop: 10 }}>
                <MoverFields m={m} />
                <button className="btn btn-primary adm-btn" type="submit">שמירה</button>
              </form>
            </details>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
