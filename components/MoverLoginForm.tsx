'use client';
import { Check, Copy, Mail, RefreshCw } from 'lucide-react';
import { useState } from 'react';

const gen = () => {
  const a = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const r = crypto.getRandomValues(new Uint32Array(10));
  return Array.from(r, (n) => a[n % a.length]).join('');
};

/** Admin: set a mover's panel email + first password, with a ready-to-send message. */
export function MoverLoginForm({ id, email, hasLogin, panelUrl, firstName, action }: {
  id: string; email: string; hasLogin: boolean; panelUrl: string; firstName: string; action: (f: FormData) => void;
}) {
  const [em, setEm] = useState(email);
  const [pw, setPw] = useState(() => gen());
  const [copied, setCopied] = useState(false);
  const msg = `שלום${firstName ? ` ${firstName}` : ''}, פתחנו לך גישה לסביבת המובילים של MoveMatch, שם רואים את כל הפניות, ההצעות, היומן והחשבוניות.\nכניסה: ${panelUrl}\nמשתמש: ${em}\nסיסמה ראשונית: ${pw}\nבכניסה הראשונה המערכת תבקש לבחור סיסמה אישית.`;
  return (
    <form action={action} className="adm-mover-form" style={{ marginTop: 10 }}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="first" value={firstName} />
      <div className="field" style={{ margin: 0 }}><label htmlFor={`le-${id}`}>דוא״ל לכניסה</label><input id={`le-${id}`} name="email" type="email" className="input" dir="ltr" required value={em} onChange={(e) => setEm(e.target.value)} /></div>
      <div className="field" style={{ margin: 0 }}><label htmlFor={`lp-${id}`}>{hasLogin ? 'סיסמה ראשונית חדשה' : 'סיסמה ראשונית'} (8+ תווים)</label>
        <div style={{ display: 'flex', gap: 6 }}><input id={`lp-${id}`} name="password" className="input" dir="ltr" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} style={{ flex: 1 }} />
          <button type="button" className="btn btn-secondary adm-btn" onClick={() => setPw(gen())} aria-label="סיסמה אקראית חדשה" title="סיסמה אקראית חדשה"><RefreshCw size={14} /></button></div></div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', gridColumn: '1 / -1' }}>
        <button className="btn btn-primary adm-btn" type="submit" name="send" value="1"><Mail size={14} /> {hasLogin ? 'איפוס סיסמה ושליחה במייל' : 'פתיחת גישה ושליחה במייל'}</button>
        {/* Copy and save are ONE action: the copied message always carries the password that gets saved.
            (Copying and saving separately let the two drift apart, and movers got "invalid login".) */}
        <button type="button" className="btn btn-secondary adm-btn" onClick={async (e) => {
          const form = e.currentTarget.form;
          if (!form || !form.reportValidity()) return;
          try { await navigator.clipboard.writeText(msg); } catch { alert('ההעתקה נכשלה, הסיסמה לא נשמרה. נסו שוב.'); return; }
          setCopied(true);
          form.requestSubmit();
        }}>
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'הועתק ונשמר' : 'שמירה והעתקת הודעה למוביל'}</button>
      </div>
      <p className="small muted" style={{ margin: 0, gridColumn: '1 / -1' }}>הכפתור הראשי שומר ושולח למוביל מייל. מעדיפים וואטסאפ? &quot;שמירה והעתקת הודעה&quot; שומר את הסיסמה ומעתיק את ההודעה באותה לחיצה, ואז מדביקים ושולחים. אל תעתיקו הודעה מכרטיס שכבר נשמר: לחיצה נוספת יוצרת סיסמה חדשה.</p>
    </form>
  );
}
