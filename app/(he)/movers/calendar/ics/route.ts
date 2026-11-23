import { loadSchedule } from '@/lib/mover';
import { siteUrl } from '@/lib/notify';

export const dynamic = 'force-dynamic';

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\;');
/** RFC 5545 line folding at 75 octets. */
function fold(line: string) {
  const enc = new TextEncoder();
  let out = '', bytes = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (bytes + n > 75) { out += '\r\n '; bytes = 1; }
    out += ch; bytes += n;
  }
  return out;
}

/** All of this mover's booked jobs as an .ics file (Google Calendar → Import). */
export async function GET() {
  const { jobs } = await loadSchedule();
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MoveMatch//Mover Panel//HE', 'CALSCALE:GREGORIAN', 'X-WR-TIMEZONE:Asia/Jerusalem',
    'BEGIN:VTIMEZONE', 'TZID:Asia/Jerusalem', 'BEGIN:STANDARD', 'DTSTART:19701025T020000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'TZOFFSETFROM:+0300', 'TZOFFSETTO:+0200', 'END:STANDARD',
    'BEGIN:DAYLIGHT', 'DTSTART:19700327T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYMONTHDAY=23,24,25,26,27,28,29;BYDAY=FR', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0300', 'END:DAYLIGHT', 'END:VTIMEZONE'];
  for (const j of jobs) {
    const d = j.date.replace(/-/g, '');
    const t = j.start.replace(':', '');
    const end = j.end ? j.end.replace(':', '') : t ? String(Math.min(23, Number(t.slice(0, 2)) + 4)).padStart(2, '0') + t.slice(2) : '';
    lines.push('BEGIN:VEVENT', `UID:movematch-${j.key}@movematch`, `DTSTAMP:${now}`,
      t ? `DTSTART;TZID=Asia/Jerusalem:${d}T${t}00` : `DTSTART;VALUE=DATE:${d}`,
      ...(t ? [`DTEND;TZID=Asia/Jerusalem:${d}T${end}00`] : []),
      `SUMMARY:${esc(`הובלה: ${j.title}${j.tender ? ` (מכרז ${j.tender})` : ''}`)}`,
      ...(j.fromText || j.toText ? [`LOCATION:${esc(j.fromText)}`] : []),
      ...(siteUrl() ? [`URL:${siteUrl()}${j.href}`] : []),
      'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return new Response(lines.map(fold).join('\r\n') + '\r\n', {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': 'attachment; filename="movematch.ics"', 'Cache-Control': 'no-store' },
  });
}
