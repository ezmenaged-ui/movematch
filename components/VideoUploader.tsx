'use client';
import { Check, Clock, Copy, Upload, Video, X } from 'lucide-react';
import { useRef } from 'react';
import { fmtDuration, MAX_VIDEO_BYTES, MAX_VIDEO_SECONDS_TOLERANCE } from '@/lib/client';

export type Clip = {
  key: string; file: File; name: string; size: number; duration: number | null;
  progress: number; state: 'queued' | 'uploading' | 'done' | 'error' | 'too_big' | 'too_long'; path?: string;
};

export const CHECKLIST = [
  ['הבניין', 'רק מדרגות? צרות?'],
  ['כל הפריטים', 'שעוברים'],
  ['מה צריך פירוק', ''],
  ['שביר או כבד', 'ספרו בקול'],
] as const;

export function Checklist() {
  return (
    <ol className="checklist">
      {CHECKLIST.map(([b, t], i) => (
        <li key={b}><span className="n">{String(i + 1).padStart(2, '0')}</span><span><b>{b}</b>{t && (b === 'כל הפריטים' ? ' ' : ': ')}{t}</span></li>
      ))}
    </ol>
  );
}

/** The two rules we want every uploader to notice: 4 minutes max per clip, and several clips are fine. */
export function VideoRules() {
  return (
    <div className="video-rules" role="note">
      <div className="rule"><Clock size={22} strokeWidth={1.5} aria-hidden /><span><b>כל סרטון עד 4 דקות</b><small>סרטון ארוך יותר לא יעלה</small></span></div>
      <div className="rule"><Copy size={22} strokeWidth={1.5} aria-hidden /><span><b>אפשר להעלות כמה סרטונים</b><small>למשל סרטון לכל חדר</small></span></div>
    </div>
  );
}

const mb = (n: number) => `${(n / 1024 / 1024).toFixed(n > 10 * 1024 * 1024 ? 0 : 1)}MB`;

export function VideoButtons({ onFiles, compact = false, more = false }: { onFiles: (f: File[]) => void; compact?: boolean; more?: boolean }) {
  const cam = useRef<HTMLInputElement>(null);
  const gal = useRef<HTMLInputElement>(null);
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => { const f = Array.from(e.target.files || []); e.target.value = ''; if (f.length) onFiles(f); };
  return (
    <div className="video-actions">
      <input ref={cam} type="file" accept="video/*" capture="environment" hidden onChange={pick} />
      <input ref={gal} type="file" accept="video/*" multiple hidden onChange={pick} />
      <button type="button" className={`btn ${more ? 'btn-secondary' : 'btn-primary blueprint'} ${compact ? 'btn-lg' : 'btn-xl'}`} onClick={() => cam.current?.click()}>
        {!more && <><i className="corner tl" /><i className="corner tr" /><i className="corner bl" /><i className="corner br" /></>}
        <Video size={20} strokeWidth={1.5} aria-hidden /> {more ? 'צלמו סרטון נוסף' : 'התחילו לצלם'}
      </button>
      <button type="button" className={`btn btn-secondary ${compact ? 'btn-lg' : 'btn-xl'}`} onClick={() => gal.current?.click()}>
        <Upload size={18} strokeWidth={1.5} aria-hidden /> {more ? 'העלו סרטון נוסף' : 'העלו מהגלריה (אפשר כמה)'}
      </button>
    </div>
  );
}

export function ClipList({ clips, onRemove }: { clips: Clip[]; onRemove: (key: string) => void }) {
  if (!clips.length) return null;
  const ok = clips.filter((c) => c.state !== 'too_big' && c.state !== 'too_long' && c.state !== 'error').length;
  return (
    <div className="stack" style={{ gap: 10 }}>
      {ok > 0 && <div className="small" style={{ fontWeight: 700 }}>{ok === 1 ? 'סרטון אחד' : `${ok} סרטונים`}</div>}
      {clips.map((c) => (
        <div key={c.key} className={`clip ${c.state === 'error' || c.state === 'too_big' || c.state === 'too_long' ? 'err' : ''}`}>
          <div className="clip-top">
            <span className="clip-name">{c.name}</span>
            <span style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 'none' }}>
              <span className="small">{fmtDuration(c.duration)} {mb(c.size)}</span>
              {c.state === 'done' ? <Check size={16} strokeWidth={2} color="var(--color-accent)" aria-label="הועלה" /> : (
                <button type="button" className="btn-link" style={{ padding: 4, minHeight: 0 }} onClick={() => onRemove(c.key)} aria-label="הסרה"><X size={16} /></button>
              )}
            </span>
          </div>
          {c.state === 'too_long' && <span className="small">הסרטון ארוך מ-4 דקות ולכן לא יעלה. צלמו אותו מחדש בכמה סרטונים קצרים יותר.</span>}
          {c.state === 'too_big' && <span className="small">הקובץ גדול מדי. צלמו סרטון קצר יותר, או צלמו באיכות רגילה (לא 4K).</span>}
          {c.state === 'error' && <span className="small">ההעלאה נכשלה. נסו שוב.</span>}
          {(c.state === 'uploading' || c.state === 'queued') && <div className="bar"><i style={{ width: `${c.progress}%` }} /></div>}
        </div>
      ))}
    </div>
  );
}

export const tooBig = (f: File) => f.size > MAX_VIDEO_BYTES;
export const tooLong = (seconds: number | null) => seconds != null && seconds > MAX_VIDEO_SECONDS_TOLERANCE;
