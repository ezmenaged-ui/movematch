'use client';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

type Opt = { v: string; label: string };

function MultiSelect({ label, all, options, value, onChange }: { label: string; all: string; options: Opt[]; value: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  const text = value.length === 0 ? all : value.length === 1 ? options.find((o) => o.v === value[0])?.label : `${label} (${value.length})`;
  return (
    <div className={`mmx-ms ${value.length ? 'on' : ''}`} ref={ref}>
      <button type="button" className="mmx-ms-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span>{text}</span><ChevronDown size={16} />
      </button>
      {open && (
        <div className="mmx-ms-pop" role="listbox" aria-multiselectable>
          {options.map((o) => {
            const on = value.includes(o.v);
            return (
              <button key={o.v} type="button" role="option" aria-selected={on} className={on ? 'on' : ''}
                onClick={() => onChange(on ? value.filter((x) => x !== o.v) : [...value, o.v])}>
                <span className="mmx-ms-box">{on && <Check size={13} strokeWidth={3} />}</span>{o.label}
              </button>
            );
          })}
          {value.length > 0 && <button type="button" className="mmx-ms-clear" onClick={() => onChange([])}>ניקוי</button>}
        </div>
      )}
    </div>
  );
}

/** Leads filters: apply instantly (no button). Status and funnel are multi-select; search applies as you type. */
export function LeadsFilter({ statuses, funnels }: { statuses: Opt[]; funnels: Opt[] }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const [, start] = useTransition();
  const list = (k: string) => (sp.get(k) || '').split(',').filter(Boolean);
  // Local state is the source of truth, so fast clicks never read a stale URL.
  const [q, setQ] = useState(sp.get('q') || '');
  const [f, setF] = useState<string[]>(list('f'));
  const [v, setV] = useState<string[]>(list('v'));
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const t = setTimeout(() => {
      const next = new URLSearchParams();
      if (q.trim()) next.set('q', q.trim());
      if (f.length) next.set('f', f.join(','));
      if (v.length) next.set('v', v.join(','));
      start(() => router.replace(`${path}${next.toString() ? `?${next}` : ''}`, { scroll: false }));
    }, q === (sp.get('q') || '') ? 0 : 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, f, v]);

  return (
    <div className="mmx-filter">
      <label className="mmx-search">
        <Search size={16} aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש לפי שם, טלפון, עיר או מכרז" aria-label="חיפוש" />
        {q && <button type="button" onClick={() => setQ('')} aria-label="ניקוי החיפוש"><X size={14} /></button>}
      </label>
      <MultiSelect label="סטטוסים" all="כל הסטטוסים" options={statuses} value={f} onChange={setF} />
      <MultiSelect label="משפכים" all="כל המשפכים" options={funnels} value={v} onChange={setV} />
    </div>
  );
}
