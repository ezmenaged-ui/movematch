'use client';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

export function CopyButton({ text, label = 'העתקה' }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" className="btn btn-secondary adm-btn" onClick={async () => {
      try { await navigator.clipboard.writeText(text); } catch {
        const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove();
      }
      setOk(true); setTimeout(() => setOk(false), 1600);
    }}>
      {ok ? <Check size={14} /> : <Copy size={14} />} {ok ? 'הועתק' : label}
    </button>
  );
}

/** Closes the surrounding <details> card (handy at the bottom of a long open card). */
export function CloseCard() {
  return (
    <button type="button" className="btn btn-secondary adm-btn" onClick={(e) => {
      const d = (e.currentTarget as HTMLElement).closest('details');
      if (d) { d.open = false; d.scrollIntoView({ block: 'nearest' }); }
    }}>סגירת הכרטיס ▲</button>
  );
}
