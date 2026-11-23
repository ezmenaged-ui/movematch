'use client';
import { useEffect, useState } from 'react';
import { useT } from './Locale';

/**
 * Live countdown to a tender's closing time (12h after the client completes the details).
 * `serverNow` corrects for a wrong clock on the viewer's device.
 */
export function Countdown({ closesAt, serverNow, variant = 'pill' }: { closesAt: string; serverNow: string; variant?: 'pill' | 'bar' }) {
  const d = useT().tender;
  const [offset] = useState(() => new Date(serverNow).getTime() - Date.now());
  const end = new Date(closesAt).getTime();
  const [left, setLeft] = useState(() => end - (Date.now() + offset));
  useEffect(() => {
    const t = setInterval(() => setLeft(end - (Date.now() + offset)), 1000);
    return () => clearInterval(t);
  }, [end, offset]);

  if (left <= 0) return <span className={`cd cd-${variant} closed`} role="status">{d.closed}</span>;
  const s = Math.floor(left / 1000);
  const hh = String(Math.floor(s / 3600)).padStart(2, '0'), mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0'), ss = String(s % 60).padStart(2, '0');
  return (
    <span className={`cd cd-${variant} ${s < 3600 ? 'soon' : ''}`} role="timer" aria-label={d.closesAria(Math.floor(s / 3600), Math.floor((s % 3600) / 60))}>
      <i className="live-dot" aria-hidden /> {d.closesIn} <b dir="ltr">{hh}:{mm}:{ss}</b>
    </span>
  );
}
