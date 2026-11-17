'use client';
import { Check, Clock, Copy, Upload, Video, X } from 'lucide-react';
import { useRef } from 'react';
import { fmtDuration, MAX_VIDEO_BYTES, MAX_VIDEO_SECONDS_TOLERANCE } from '@/lib/client';
import '@/app/items.css';

export type Clip = {
  key: string; file: File; name: string; size: number; duration: number | null;
  progress: number; state: 'queued' | 'uploading' | 'done' | 'error' | 'too_big' | 'too_long' | 'not_video'; path?: string;
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

/**
 * How to film the apartment, shown on every video step (C, D, E and the phone upload page /u).
 * Why it matters: a clear, full video is what keeps the price, the work and the insurance aligned with the movers.
 */
export function VideoGuide({ compact = false }: { compact?: boolean }) {
  return (
    <div className="vid-guide vid-guide-full" role="note">
      <p className="vid-why"><b>סרטון ברור ומפורט הוא החלק הכי חשוב בבקשה.</b> לפיו המובילים יודעים בדיוק מה מובילים, מה מפרקים ומה מרכיבים, וכמה זה עולה. ככה אין הפתעות במחיר ואין אי־נעימויות ביום ההובלה. עדיף סרטון ארוך וברור מאשר קצר וחלקי.</p>
      <b>איך מצלמים</b>
      <ol>
        <li><b>מתחילים מהכניסה לבית,</b> ואם אפשר גם מהכניסה לבניין.</li>
        <li><b>עוברים חדר אחרי חדר, פריט אחרי פריט,</b> לאט ובלי לדלג.</li>
        <li><b>אומרים בקול על כל פריט:</b> האם הוא עובר, האם צריך לפרק אותו, האם צריך להרכיב אותו מחדש בבית החדש, ומה אסור לפרק.</li>
        <li><b>מצלמים את כל המסדרונות, הדלתות והפתחים</b> בין החדרים, כדי שהמובילים יראו אם משהו יתקשה לצאת מחדר או להיכנס אליו.</li>
      </ol>
      {!compact && <p className="vid-for-you"><b>זה לטובתכם:</b> סרטון טוב מבטיח שלא יהיו הפתעות במחיר, שההובלה תיעשה נכון, ושהחפצים שלכם יבוטחו כמו שצריך.</p>}
      <small>כל סרטון עד 4 דקות. אפשר להעלות כמה סרטונים, למשל אחד לכל חדר.</small>
    </div>
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
  const ok = clips.filter((c) => !clipRejected(c) && c.state !== 'error').length;
  return (
    <div className="stack" style={{ gap: 10 }}>
      {ok > 0 && <div className="small" style={{ fontWeight: 700 }}>{ok === 1 ? 'סרטון אחד' : `${ok} סרטונים`}</div>}
      {clips.map((c) => (
        <div key={c.key} className={`clip ${c.state === 'error' || clipRejected(c) ? 'err' : ''}`}>
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
          {c.state === 'not_video' && <span className="small">הקובץ הזה אינו סרטון ולכן לא יעלה. בחרו קובץ וידאו.</span>}
          {c.state === 'error' && <span className="small">ההעלאה נכשלה. נסו שוב.</span>}
          {(c.state === 'uploading' || c.state === 'queued') && <div className="bar"><i style={{ width: `${c.progress}%` }} /></div>}
        </div>
      ))}
    </div>
  );
}

export const tooBig = (f: File) => f.size > MAX_VIDEO_BYTES;
/** Clips that are never uploaded: too big, too long, or not a video at all. */
export const clipRejected = (c: Pick<Clip, 'state'>) => c.state === 'too_big' || c.state === 'too_long' || c.state === 'not_video';

/**
 * Is this file really a video? Checks the first bytes (container signature), not the name or the browser's MIME guess,
 * which both come from the file extension. Never rejects a file it can't read, so a real clip is never blocked.
 */
export async function looksLikeVideo(f: File): Promise<boolean> {
  if (/^(image|audio|text)\//.test(f.type) || /^application\/(pdf|zip|json|msword|vnd\.)/.test(f.type)) return false;
  let b: Uint8Array;
  try { b = new Uint8Array(await f.slice(0, 16).arrayBuffer()); } catch { return true; }
  if (b.length < 12) return false;
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  const box = ascii(4, 8); // MP4 / MOV / 3GP / M4V: an ISO-BMFF or QuickTime box at offset 4
  if (['ftyp', 'moov', 'mdat', 'wide', 'free', 'skip', 'pnot', 'uuid'].includes(box)) return true;
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return true; // WebM / MKV
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'AVI ') return true; // AVI
  if (b[0] === 0 && b[1] === 0 && b[2] === 1 && (b[3] === 0xba || b[3] === 0xb3)) return true; // MPEG-PS
  if (b[0] === 0x47 && f.size > 188 * 2) return true; // MPEG-TS (sync byte)
  return false;
}
export const tooLong = (seconds: number | null) => seconds != null && seconds > MAX_VIDEO_SECONDS_TOLERANCE;
