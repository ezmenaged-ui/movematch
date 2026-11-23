'use client';
import { Smartphone } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import type { LeadRef } from '@/lib/client';
import { lp } from '@/lib/i18n';
import { useLocale, useT } from './Locale';

/** Desktop only: a QR code that opens the phone upload page for this same lead,
 *  plus a live count of videos that arrived from the phone. */
/** `ownCount`: videos this page already uploaded itself. The lead's video count includes them, so they are subtracted:
 *  only videos that really came from the phone count as "from the phone". */
/** `returnToDesktop`: the client finishes on the computer (funnel D: the item list comes after the video; funnel E: the
 *  client sends from the computer, where the optional item list is too). The phone then only films, and tells the client
 *  to come back to the computer, instead of offering to finish there. `nextLabel`: the desktop button to press then. */
export function QrHandoff({ leadRef, onRemoteCount, onCompleted, ownCount = 0, returnToDesktop = false, nextLabel }: { leadRef: LeadRef; onRemoteCount: (n: number) => void; onCompleted?: () => void; ownCount?: number; returnToDesktop?: boolean; nextLabel?: string }) {
  const locale = useLocale();
  const T = useT(), q = T.qr;
  nextLabel ??= T.common.next;
  const [svg, setSvg] = useState('');
  const [total, setTotal] = useState(0);
  const count = Math.max(0, total - ownCount);
  const cb = useRef(onRemoteCount);
  cb.current = onRemoteCount;
  const doneCb = useRef(onCompleted);
  doneCb.current = onCompleted;
  const { id, token } = leadRef;

  useEffect(() => {
    const url = `${window.location.origin}${lp(locale, `/u/${id}`)}?k=${token}${returnToDesktop ? '&b=1' : ''}`; // the phone page in the same language
    QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#1d2d3d', light: '#ffffff' } }).then(setSvg).catch(() => {});
  }, [id, token, returnToDesktop, locale]);

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/leads/${id}/videos?k=${token}`, { cache: 'no-store' });
        if (r.ok) { const { count: n, status } = await r.json(); if (!stop) { setTotal(n); if (status === 'complete') doneCb.current?.(); } }
      } catch { /* ignore */ }
    };
    tick();
    const t = setInterval(tick, 4000);
    return () => { stop = true; clearInterval(t); };
  }, [id, token]);

  useEffect(() => { cb.current(count); }, [count]);

  return (
    <div className="qr-handoff desktop-only">
      <div className="qr-box" role="img" aria-label={q.aria} dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="qr-text">
        <b><Smartphone size={18} strokeWidth={1.5} aria-hidden /> {q.title}</b>
        <span>{returnToDesktop ? q.bodyBack : q.bodyFinish}</span>
        {count > 0
          ? <span className="qr-got">✓ {q.got(count)}. {returnToDesktop ? q.pressNext(nextLabel) : q.canSend}</span>
          : <span className="qr-wait"><i className="qr-dot" /> {q.waiting}</span>}
      </div>
    </div>
  );
}
