'use client';
import { ArrowRight, Check, Monitor } from 'lucide-react';
import { useEffect, useState } from 'react';
import { track, updateLead } from '@/lib/client';
import { useUploads } from './useUploads';
import { Checklist, ClipList, VideoButtons, VideoRules } from './VideoUploader';
import { Blueprint, Corners, Header, Spinner } from './ui';

type Status = { count: number; status: 'partial' | 'complete'; ready: boolean };

/** Opened by scanning the QR code on the desktop. Films/uploads straight into the same lead,
 *  and can finish the whole request from the phone (the desktop follows along). */
export function PhoneUpload({ id, token, tender }: { id: string; token: string; tender?: string }) {
  const up = useUploads();
  const [st, setSt] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState('');
  const [finished, setFinished] = useState(false);

  useEffect(() => { if (id && token) up.attach({ id, token }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id, token]);
  useEffect(() => {
    if (!id || !token) return;
    let stop = false;
    const tick = async () => {
      try { const r = await fetch(`/api/leads/${id}/videos?k=${token}`, { cache: 'no-store' }); if (r.ok && !stop) setSt(await r.json()); } catch { /* ignore */ }
    };
    tick();
    const t = setInterval(tick, 4000);
    return () => { stop = true; clearInterval(t); };
  }, [id, token]);

  const done = up.clips.filter((c) => c.state === 'done').length;
  const uploading = up.clips.some((c) => c.state === 'uploading' || c.state === 'queued');
  const total = Math.max(done, st?.count || 0);
  const complete = finished || st?.status === 'complete';

  async function finish() {
    setBusy(true); setFail('');
    try {
      await updateLead({ id, token }, { status: 'complete', furthest_step: 6, video_skipped: false });
      track('lead_complete', { via: 'phone' });
      setFinished(true);
    } catch { setFail('משהו השתבש. נסו שוב בעוד רגע.'); } finally { setBusy(false); }
  }

  if (!id || !token) return (<><Header /><main className="wiz"><Blueprint className="wiz-card"><h2>הקישור לא תקין</h2><p className="muted">סרקו שוב את הקוד מהמחשב.</p></Blueprint></main></>);

  // Opened from the tender page: only add videos to the existing tender (no "finish" step, nothing re-sent to movers).
  if (tender) {
    return (
      <>
        <Header />
        <main className="wiz">
          <Blueprint className="wiz-card">
            <h1 className="phone-add-h">הוספת סרטון למכרז שלך</h1>
            <div className="stack">
              <p className="muted" style={{ margin: 0 }}>צלמו סרטון קצר של החדרים והרהיטים. הוא יתווסף למכרז ויוצג למובילים, כדי שיוכלו לתת מחיר מדויק.</p>
              {done > 0 && !uploading && (
                <div className="phone-done">
                  <span className="done-icon blueprint" style={{ margin: 0, width: 44, height: 44 }}><Corners /><Check size={22} strokeWidth={1.5} /></span>
                  <span><b>{done === 1 ? 'הסרטון נוסף למכרז.' : `${done} סרטונים נוספו למכרז.`}</b><br />אפשר להוסיף עוד, או לחזור לדף המכרז.</span>
                </div>
              )}
              <VideoRules />
              <Checklist />
              <ClipList clips={up.clips} onRemove={up.remove} />
              {up.clips.some((c) => c.state === 'error') && <button type="button" className="btn-link" onClick={up.retryFailed}>נסו להעלות שוב</button>}
              <VideoButtons onFiles={up.add} more={up.usable.length > 0} />
              {uploading && <p className="small" style={{ color: 'var(--color-accent-700)', margin: 0 }}>מעלים… השאירו את הדף פתוח עד שזה מסתיים.</p>}
              <a href={`/t/${tender}`} className="btn-link"><ArrowRight size={16} strokeWidth={1.75} aria-hidden /> חזרה לדף המכרז</a>
            </div>
          </Blueprint>
        </main>
      </>
    );
  }

  if (complete && !uploading) {
    return (
      <>
        <Header />
        <main className="wiz">
          <Blueprint className="wiz-card done-wrap">
            <span className="done-icon blueprint"><Corners /><Check size={28} strokeWidth={1.5} /></span>
            <h2 style={{ marginBottom: 14 }}>קיבלנו. ההצעות בדרך.</h2>
            <p className="muted">שלחנו את הסרטון למובילים מדורגים באזור שלכם. ההצעות יגיעו אליכם לטלפון.</p>
            <VideoButtons onFiles={up.add} more />
          </Blueprint>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="wiz">
        <Blueprint className="wiz-card">
          <h2>צלמו סרטון קצר</h2>
          <div className="stack">
            {total > 0 && !uploading && (
              st?.ready ? (
                <div className="phone-finish">
                  <p style={{ margin: 0 }}><b>{total === 1 ? 'הסרטון הגיע.' : `${total} סרטונים הגיעו.`}</b> אפשר לסיים כאן, או לחזור למחשב ולשלוח משם.</p>
                  <button type="button" className="btn btn-primary btn-xl blueprint" onClick={finish} disabled={busy} aria-busy={busy}><Corners />{busy && <Spinner />} שלחו לי 5 הצעות</button>
                  {fail && <div className="field-error" role="alert">{fail}</div>}
                </div>
              ) : (
                <div className="phone-done">
                  <span className="done-icon blueprint" style={{ margin: 0, width: 44, height: 44 }}><Corners /><Check size={22} strokeWidth={1.5} /></span>
                  <span><b>{total === 1 ? 'הסרטון הגיע' : `${total} סרטונים הגיעו`}.</b><br /><Monitor size={14} strokeWidth={1.5} /> חזרו למחשב כדי להשלים את הפרטים החסרים ולשלוח.</span>
                </div>
              )
            )}
            <VideoRules />
            <Checklist />
            <ClipList clips={up.clips} onRemove={up.remove} />
            {up.clips.some((c) => c.state === 'error') && <button type="button" className="btn-link" onClick={up.retryFailed}>נסו להעלות שוב</button>}
            <VideoButtons onFiles={up.add} more={up.usable.length > 0} />
            {uploading && <p className="small" style={{ color: 'var(--color-accent-700)', margin: 0 }}>מעלים… השאירו את הדף פתוח עד שזה מסתיים.</p>}
          </div>
        </Blueprint>
      </main>
    </>
  );
}
