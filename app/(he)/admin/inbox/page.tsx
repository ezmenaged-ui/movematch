import Link from 'next/link';
import { headers } from 'next/headers';
import { ArrowRight, Check, CheckCheck, Clock, FileText, MessageCircle, Phone, TriangleAlert } from 'lucide-react';
import { AdminHero, AdminShell } from '@/components/AdminShell';
import { db, LeadRow } from '@/lib/db';
import { tenderRef } from '@/lib/publicLead';
import { Conversation, displayPhone, hoursText, InboxMsg, mediaProxyUrl, windowLeftMs } from '@/lib/inbox';
import { attachInboxVideo, sendInboxReply } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'WhatsApp · MoveMatch', robots: { index: false } };

const time = (d: string) => new Date(d).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
const ERR: Record<string, string> = {
  window: 'לא נשלח: עברו 24 שעות מההודעה האחרונה של הלקוח. ווטסאפ לא מאפשר לכתוב חופשי, אפשר להתקשר.',
  throttled: 'לא נשלח: יותר מדי הודעות ברצף לאותו מספר (הגנה על המספר העסקי). נסה/י שוב בעוד כמה דקות.',
  failed: 'השליחה נכשלה. בדוק/י את יומן Twilio.',
};
const STATUS: Record<string, React.ReactNode> = {
  queued: <Clock size={13} />, sent: <Check size={13} />, delivered: <CheckCheck size={13} />,
  read: <CheckCheck size={13} color="#2f6b4f" />, failed: <TriangleAlert size={13} color="#b42318" />, undelivered: <TriangleAlert size={13} color="#b42318" />,
};

/**
 * WhatsApp inbox: messages people sent to the business number, and our replies (migration 024, lib/inbox.ts).
 * The operator normally answers by replying to the WhatsApp alert; this page is the backup and the history.
 */
export default async function InboxPage({ searchParams }: { searchParams: Promise<{ p?: string; sent?: string; err?: string; vok?: string; verr?: string }> }) {
  const sp = await searchParams;
  const sel = (sp.p || '').replace(/\D/g, '');
  const secret = process.env.MM_ADMIN_SECRET;
  const [{ data: listData, error }, { data: threadData }, { data: leadData }] = await Promise.all([
    db().rpc('mm_inbox_list', { p_secret: secret }),
    sel ? db().rpc('mm_inbox_thread', { p_secret: secret, p_phone: sel }) : Promise.resolve({ data: [] }),
    sel ? db().rpc('mm_admin_list', { p_secret: secret, p_limit: 500 }) : Promise.resolve({ data: [] }),
  ]);
  // The client's latest lead (phones: inbox 9725XXXXXXXX, leads 05XXXXXXXX).
  const local = sel.startsWith('972') ? '0' + sel.slice(3) : sel;
  const lead = ((leadData || []) as LeadRow[]).find((l) => l.phone === local) || null;
  const inLead = (url: string) => !!lead?.videos.some((v) => (v as { src?: string }).src === url);
  if (error) return <main style={{ padding: 24 }}>שגיאה בטעינת ההודעות: {error.message} (האם מיגרציה 024 הוחלה?)</main>;
  const convs = (listData || []) as Conversation[];
  const thread = (threadData || []) as InboxMsg[];
  const conv = convs.find((c) => c.phone === sel);
  const waiting = convs.filter((c) => c.last_dir === 'in' && windowLeftMs(c.last_in) > 0).length;

  const h = await headers();
  const base = `https://${h.get('x-forwarded-host') || h.get('host')}`;
  const left = windowLeftMs(conv?.last_in);

  return (
    <AdminShell active="inbox" title="הודעות ווטסאפ">
      <AdminHero kicker="המספר העסקי" title="הודעות ווטסאפ"
        sub="כל מה שנשלח למספר העסקי. הדרך הרגילה לענות: לחיצה ארוכה על ההתראה בווטסאפ שלך ← השב. אפשר לענות גם מכאן." />
      {waiting > 0 && <div className="mmx-inbox-note"><MessageCircle size={16} /> {waiting} שיחות מחכות לתשובה</div>}

      <div className={`mmx-inbox ${sel ? 'has-sel' : ''}`}>
        <nav className="mmx-inbox-list" aria-label="שיחות">
          {!convs.length && <div className="mmx-empty">עדיין אין הודעות.</div>}
          {convs.map((c) => {
            const open = windowLeftMs(c.last_in) > 0;
            return (
              <Link key={c.phone} href={`/admin/inbox?p=${c.phone}#end`} className={`mmx-conv ${c.phone === sel ? 'on' : ''}`}>
                <span className="mmx-conv-top">
                  <b>{c.name || displayPhone(c.phone)}</b>
                  <small>{time(c.last_at)}</small>
                </span>
                <span className="mmx-conv-sub">
                  {c.last_dir === 'out' ? 'את/ה: ' : ''}{c.last_body || (c.last_media ? '📷 קובץ' : '—')}
                </span>
                <span className="mmx-conv-tags">
                  {c.last_dir === 'in' && open && <em className="mmx-tag due">מחכה לתשובה</em>}
                  {!open && <em className="mmx-tag">חלון סגור</em>}
                </span>
              </Link>
            );
          })}
        </nav>

        <section className="mmx-thread" aria-label="שיחה">
          {!sel ? <div className="mmx-empty">בחר/י שיחה מהרשימה.</div> : (
            <>
              <header className="mmx-thread-h">
                <Link href="/admin/inbox" className="mmx-thread-back" aria-label="חזרה לרשימה"><ArrowRight size={18} /></Link>
                <div>
                  <b>{conv?.name || displayPhone(sel)}</b>
                  <small dir="ltr">{displayPhone(sel)}</small>
                </div>
                {lead
                  ? <a className="mmx-btn ghost" href={`/admin?q=${lead.phone}&open=${lead.id}#lead-${lead.id}`}>ליד {tenderRef(lead)} ({lead.status === 'complete' ? 'מלא' : 'חלקי'})</a>
                  : <span className="small muted">אין ליד למספר הזה</span>}
                <a className="mmx-btn ghost" href={`tel:+${sel}`}><Phone size={15} /> חיוג</a>
              </header>

              <div className="mmx-msgs">
                {thread.map((m) => (
                  <div key={m.id} className={`mmx-msg ${m.dir}`}>
                    {m.media.map((f, i) => {
                      const src = mediaProxyUrl(f.url, base);
                      return f.type.startsWith('image/')
                        ? <a key={i} href={src} target="_blank" rel="noreferrer"><img src={src} alt="תמונה שנשלחה" loading="lazy" /></a>
                        : f.type.startsWith('video/')
                          ? <span key={i} className="mmx-vid">
                              <video src={src} controls preload="metadata" />
                              {m.dir === 'in' && lead && (inLead(f.url)
                                ? <small>✓ נוסף לליד {tenderRef(lead)}</small>
                                : <form action={attachInboxVideo}>
                                    <input type="hidden" name="lead" value={lead.id} />
                                    <input type="hidden" name="url" value={f.url} />
                                    <input type="hidden" name="type" value={f.type} />
                                    <input type="hidden" name="phone" value={sel} />
                                    <button className="mmx-btn" type="submit">הוספה לליד {tenderRef(lead)}</button>
                                  </form>)}
                            </span>
                          : f.type.startsWith('audio/')
                            ? <audio key={i} src={src} controls preload="none" />
                            : <a key={i} href={src} target="_blank" rel="noreferrer" className="mmx-file"><FileText size={16} /> קובץ ({f.type})</a>;
                    })}
                    {m.body && <p>{m.body}</p>}
                    <small>
                      {time(m.created_at)}
                      {m.dir === 'out' && <> · {m.via === 'admin' ? 'מהאתר' : 'מהווטסאפ'} {m.status && STATUS[m.status]}</>}
                    </small>
                    {m.dir === 'out' && m.error && ['failed', 'undelivered'].includes(m.status || '') && <small className="err">לא נמסר (קוד {m.error})</small>}
                  </div>
                ))}
                <span id="end" />
              </div>

              {sp.sent && <div className="mmx-inbox-ok">✓ נשלח</div>}
              {sp.vok && lead && <div className="mmx-inbox-ok">✓ הסרטון נוסף לליד. <a href={`/admin?q=${lead.phone}&open=${lead.id}#lead-${lead.id}`}>לליד, ומשם שליחה למובילים</a></div>}
              {sp.verr && <div className="mmx-inbox-err">הוספת הסרטון לליד נכשלה. אפשר להוריד אותו ולהעלות ידנית בכרטיס הליד.</div>}
              {sp.err && <div className="mmx-inbox-err">{ERR[sp.err] || ERR.failed}</div>}

              {left > 0 ? (
                <form action={sendInboxReply} className="mmx-reply">
                  <input type="hidden" name="phone" value={sel} />
                  <textarea name="body" required rows={3} maxLength={1500} placeholder="כתיבת תשובה…" />
                  <div>
                    <small>אפשר לכתוב עוד {hoursText(left)} (חלון 24 השעות של ווטסאפ)</small>
                    <button className="mmx-btn" type="submit">שליחה</button>
                  </div>
                </form>
              ) : (
                <div className="mmx-inbox-err">
                  עברו 24 שעות מההודעה האחרונה של הלקוח, ולכן ווטסאפ לא מאפשר לשלוח לו הודעה חופשית. אפשר להתקשר
                  {' '}(<a href={`tel:+${sel}`} dir="ltr">{displayPhone(sel)}</a>), והשיחה תיפתח שוב ברגע שהלקוח יכתוב.
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
