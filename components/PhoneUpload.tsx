'use client';
import { ArrowRight, Check, Monitor } from 'lucide-react';
import { useEffect, useState } from 'react';
import { funnelParams, trackOnce, updateLead } from '@/lib/client';
import { useUploads } from './useUploads';
import { ClipList, VideoButtons, VideoGuide } from './VideoUploader';
import { Blueprint, Corners, Header, Spinner } from './ui';
import { lp } from '@/lib/i18n';
import { useLocale, useT } from './Locale';

type Status = { count: number; status: 'partial' | 'complete'; ready: boolean };

/** Opened by scanning the QR code on the desktop. Films/uploads straight into the same lead,
 *  and can finish the whole request from the phone (the desktop follows along). */
export function PhoneUpload({ id, token, tender, backToDesktop = false }: { id: string; token: string; tender?: string; backToDesktop?: boolean }) {
  const up = useUploads();
  const locale = useLocale();
  const T = useT(), ph = T.phone;
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
      const r = await updateLead({ id, token }, { status: 'complete', furthest_step: 6, video_skipped: false });
      // Finished on the phone (QR hand-off): same events as the desktop page, with the funnel the backend has for this lead.
      const ev = { ...funnelParams(r.funnel || 'unknown', r.theme), via: 'phone' };
      trackOnce('lead_complete', id, ev);
      if (r.new_qualified) trackOnce('qualify_lead', id, { ...ev, has_inventory: !!r.has_inventory });
      setFinished(true);
    } catch { setFail(T.common.fail); } finally { setBusy(false); }
  }

  if (!id || !token) return (<><Header /><main className="wiz"><Blueprint className="wiz-card"><h2>{ph.badLink}</h2><p className="muted">{ph.scanAgain}</p></Blueprint></main></>);

  // Opened from the tender page: only add videos to the existing tender (no "finish" step, nothing re-sent to movers).
  if (tender) {
    return (
      <>
        <Header />
        <main className="wiz">
          <Blueprint className="wiz-card">
            <h1 className="phone-add-h">{ph.addTitle}</h1>
            <div className="stack">
              <p className="muted" style={{ margin: 0 }}>{ph.addBody}</p>
              {done > 0 && !uploading && (
                <div className="phone-done">
                  <span className="done-icon blueprint" style={{ margin: 0, width: 44, height: 44 }}><Corners /><Check size={22} strokeWidth={1.5} /></span>
                  <span><b>{ph.addedN(done)}</b><br />{ph.addMore}</span>
                </div>
              )}
              <VideoGuide />
              <ClipList clips={up.clips} onRemove={up.remove} />
              {up.clips.some((c) => c.state === 'error') && <button type="button" className="btn-link" onClick={up.retryFailed}>{T.common.retryUpload}</button>}
              <VideoButtons onFiles={up.add} more={up.usable.length > 0} />
              {uploading && <p className="small" style={{ color: 'var(--color-accent-700)', margin: 0 }}>{T.common.uploading}</p>}
              <a href={lp(locale, `/t/${tender}`)} className="btn-link"><ArrowRight size={16} strokeWidth={1.75} aria-hidden /> {ph.backToTender}</a>
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
            <h2 style={{ marginBottom: 14 }}>{ph.doneTitle}</h2>
            <p className="muted">{ph.doneBody}</p>
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
          <h2>{ph.filmTitle}</h2>
          <div className="stack">
            {total > 0 && !uploading && (
              backToDesktop ? (
                <div className="phone-finish" role="status">
                  <span className="done-icon blueprint" style={{ margin: '0 auto', width: 52, height: 52 }}><Corners /><Monitor size={24} strokeWidth={1.5} /></span>
                  <p style={{ margin: 0, fontSize: 20, textAlign: 'center' }}><b>{ph.arrived(total)} {ph.backNow}</b></p>
                  <p className="muted" style={{ margin: 0, textAlign: 'center' }}>{ph.continueOnComputer}</p>
                </div>
              ) : st?.ready ? (
                <div className="phone-finish">
                  <p style={{ margin: 0 }}><b>{ph.arrived(total)}</b> {ph.canFinishHere}</p>
                  <button type="button" className="btn btn-primary btn-xl blueprint" onClick={finish} disabled={busy} aria-busy={busy}><Corners />{busy && <Spinner />} {T.common.send5}</button>
                  {fail && <div className="field-error" role="alert">{fail}</div>}
                </div>
              ) : (
                <div className="phone-done">
                  <span className="done-icon blueprint" style={{ margin: 0, width: 44, height: 44 }}><Corners /><Check size={22} strokeWidth={1.5} /></span>
                  <span><b>{ph.arrivedShort(total)}.</b><br /><Monitor size={14} strokeWidth={1.5} /> {ph.backToComputer}</span>
                </div>
              )
            )}
            <VideoGuide />
            <ClipList clips={up.clips} onRemove={up.remove} />
            {up.clips.some((c) => c.state === 'error') && <button type="button" className="btn-link" onClick={up.retryFailed}>{T.common.retryUpload}</button>}
            <VideoButtons onFiles={up.add} more={up.usable.length > 0} />
            {uploading && <p className="small" style={{ color: 'var(--color-accent-700)', margin: 0 }}>{T.common.uploading}</p>}
          </div>
        </Blueprint>
      </main>
    </>
  );
}
