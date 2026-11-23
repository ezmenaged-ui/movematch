'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useT } from './Locale';

/** Re-fetches the server page every `seconds` (and when the tab regains focus), so new offers appear live. */
export function AutoRefresh({ seconds = 20, count }: { seconds?: number; count: number }) {
  const router = useRouter();
  const d = useT().tender;
  const [prev, setPrev] = useState(count);
  const [fresh, setFresh] = useState(false);
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === 'visible') router.refresh(); }, seconds * 1000);
    const onFocus = () => router.refresh();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(t); window.removeEventListener('focus', onFocus); };
  }, [router, seconds]);
  useEffect(() => {
    if (count > prev) { setFresh(true); const t = setTimeout(() => setFresh(false), 6000); setPrev(count); return () => clearTimeout(t); }
    setPrev(count);
  }, [count, prev]);
  return (
    <div className={`live ${fresh ? 'fresh' : ''}`} role="status" aria-live="polite">
      <i className="live-dot" /> {fresh ? d.fresh : d.live}
    </div>
  );
}
