'use client';
import { Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { importEvents, type IcsEvent } from '@/app/movers/actions';

const TZ = 'Asia/Jerusalem';
function inIsrael(instant: Date) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(instant);
  const g = (t: string) => p.find((x) => x.type === t)!.value;
  return { date: `${g('year')}-${g('month')}-${g('day')}`, time: `${g('hour')}:${g('minute')}` };
}

/** Parse VEVENTs from an .ics file (e.g. Google Calendar export). UTC times are converted to Israel time. */
export function parseIcs(text: string): IcsEvent[] {
  const raw = text.replace(/\r?\n[ \t]/g, '');
  return [...raw.matchAll(/BEGIN:VEVENT\r?\n([\s\S]*?)\r?\nEND:VEVENT/g)].flatMap(([, body]) => {
    const m = body.match(/^DTSTART(?:;[^:\r\n]*)?:(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?/m);
    if (!m) return [];
    const title = (body.match(/^SUMMARY(?:;[^:\r\n]*)?:(.+)$/m)?.[1] || 'אירוע').trim().replace(/\\([nN,;\\])/g, (_, c) => (/[nN]/.test(c) ? ' ' : c));
    let date = `${m[1]}-${m[2]}-${m[3]}`, time = m[4] ? `${m[4]}:${m[5]}` : '';
    if (m[7] === 'Z') {
      const d = new Date(`${date}T${time}:${m[6] || '00'}Z`);
      if (Number.isNaN(d.valueOf())) return [];
      ({ date, time } = inIsrael(d));
    }
    const uid = body.match(/^UID:(.+)$/m)?.[1]?.trim();
    if (uid?.startsWith('movematch-')) return []; // our own export
    return [{ uid: `${uid || title}|${date}`, date, time, title }];
  });
}

export function IcsImport() {
  const ref = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => ref.current?.click()}><Upload size={15} /> ייבוא ICS</button>
      <input ref={ref} type="file" accept=".ics,text/calendar" hidden onChange={async (e) => {
        const f = e.target.files?.[0]; e.target.value = '';
        if (!f) return;
        setBusy(true); setMsg('');
        try {
          const evs = parseIcs(await f.text());
          if (!evs.length) { setMsg('לא נמצאו אירועים בקובץ.'); return; }
          const r = await importEvents(evs);
          if (!r.ok) { setMsg('הייבוא נכשל.'); return; }
          setMsg(`יובאו ${evs.length} אירועים.`);
          const first = evs.map((x) => x.date).sort().find((d) => d >= new Date().toISOString().slice(0, 10)) || evs[0].date;
          location.href = `/movers/calendar?w=${first}`;
        } catch { setMsg('לא ניתן לקרוא את הקובץ.'); } finally { setBusy(false); }
      }} />
      {msg && <span className="mv-meta" role="status" style={{ alignSelf: 'center' }}>{msg}</span>}
    </>
  );
}
