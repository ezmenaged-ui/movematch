'use client';
import { useEffect } from 'react';

/**
 * Clicking anywhere on a date (or time) box opens the calendar, not only the small calendar icon.
 * Browsers open the picker only from the icon on desktop, so clients clicking the middle of the box (where the date
 * shows) got nothing (owner's report, 22 Nov 2026). One document listener covers every date box on the site,
 * including server-rendered pages. showPicker() can throw (no user gesture, inside a cross-origin frame): ignored.
 */
export default function DatePickerOnClick() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLInputElement | null;
      if (!el || el.tagName !== 'INPUT' || (el.type !== 'date' && el.type !== 'time') || el.disabled || el.readOnly) return;
      try { el.showPicker?.(); } catch { /* not allowed here: the browser's own behaviour stays */ }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
  return null;
}
