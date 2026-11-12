'use client';
import { Search } from 'lucide-react';
import { useState } from 'react';

/** Instant filter for the lead list (matches city / tender number). */
export function MoverSearch() {
  const [q, setQ] = useState('');
  const run = (v: string) => {
    setQ(v);
    document.querySelectorAll<HTMLElement>('#mv-list [data-search]').forEach((el) => {
      el.hidden = !!v.trim() && !(el.dataset.search || '').includes(v.trim());
    });
  };
  return (
    <label className="mmx-search"><Search size={16} aria-hidden />
      <input type="search" value={q} onChange={(e) => run(e.target.value)} placeholder="חיפוש לפי עיר או מספר מכרז" aria-label="חיפוש פניות" />
    </label>
  );
}
