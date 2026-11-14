import { normalizePhone } from './validate';

const s = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined);

function addr(v: unknown) {
  if (!v || typeof v !== 'object') return undefined;
  const a = v as Record<string, unknown>;
  return {
    city: s(a.city, 80) || '', address: s(a.address, 200) || '', floor: s(a.floor, 10) || '',
    apartment: s(a.apartment, 10) || '', elevator: typeof a.elevator === 'boolean' ? a.elevator : null,
    elevator_type: a.elevator === true && ['small', 'regular', 'large'].includes(a.elevator_type as string) ? a.elevator_type : '',
  };
}

/** Whitelist + trim everything coming from the browser before it reaches the DB. */
export function cleanLeadInput(b: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  if (b.name !== undefined) out.name = s(b.name, 120);
  if (b.phone !== undefined) out.phone = normalizePhone(String(b.phone));
  if (b.city !== undefined) out.city = s(b.city, 80);
  if (b.move_from !== undefined) out.move_from = addr(b.move_from);
  if (b.move_to !== undefined) out.move_to = addr(b.move_to);
  if (b.move_when && typeof b.move_when === 'object') {
    const w = b.move_when as Record<string, unknown>;
    const date = typeof w.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(w.date) ? w.date : '';
    const time = ['morning', 'noon', 'afternoon'].includes(w.time as string) ? w.time : '';
    out.move_when = { date, date_flexible: w.date_flexible === true, time, time_flexible: w.time_flexible === true };
  }
  if (b.status === 'partial' || b.status === 'complete') out.status = b.status;
  if (Number.isInteger(b.furthest_step)) out.furthest_step = Math.min(9, Math.max(1, b.furthest_step as number));
  if (Number.isInteger(b.priority) && (b.priority as number) >= 1 && (b.priority as number) <= 5) out.priority = b.priority;
  if (b.items && typeof b.items === 'object' && Array.isArray((b.items as { list?: unknown }).list)) {
    const raw = b.items as { list: Record<string, unknown>[]; boxes?: unknown };
    out.items = {
      boxes: Math.min(500, Math.max(0, Math.floor(Number(raw.boxes) || 0))),
      ...((raw as { noAsm?: unknown }).noAsm === true ? { noAsm: true } : {}),
      list: raw.list.slice(0, 200).map((i) => ({
        id: s(i.id, 80) || '', name: s(i.name, 80) || '', qty: Math.min(99, Math.max(1, Math.floor(Number(i.qty) || 1))),
        ...(i.dis === true ? { dis: true } : {}), ...(i.asm === true ? { asm: true } : {}), ...(i.custom === true ? { custom: true } : {}),
      })).filter((i) => i.id && i.name),
    };
  }
  if (typeof b.video_skipped === 'boolean') out.video_skipped = b.video_skipped;
  if (b.theme === 'photo' || b.theme === 'art') out.theme = b.theme;
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign']) if (b[k] !== undefined) out[k] = s(b[k], 200);
  if (b.add_video && typeof b.add_video === 'object') {
    const v = b.add_video as Record<string, unknown>;
    const path = s(v.path, 300);
    if (path && /^[0-9a-f-]{36}\/[\w.-]+$/.test(path)) {
      out.add_video = { path, parts: Math.min(50, Math.max(1, Math.floor(Number(v.parts) || 1))), size: Number(v.size) || null, duration_s: Number(v.duration_s) || null, name: s(v.name, 120) };
    }
  }
  return out;
}
