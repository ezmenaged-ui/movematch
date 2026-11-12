'use client';
import { useState } from 'react';

const MAX_SIDE = 512, MAX_BYTES = 350 * 1024;

/** Shrink an image in the browser (max 512px, WebP) so any phone photo / big logo fits the 400KB logo limit. */
async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  const img = await createImageBitmap(file).catch(() => null);
  if (!img) return file;
  const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(img.width * scale)); c.height = Math.max(1, Math.round(img.height * scale));
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  for (const q of [0.9, 0.8, 0.65, 0.5]) {
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/webp', q));
    if (blob && blob.type === 'image/webp' && blob.size <= MAX_BYTES) return new File([blob], 'logo.webp', { type: 'image/webp' });
    if (blob && blob.type !== 'image/webp') { // browser without WebP encoding → PNG/JPEG
      const jpg = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', q));
      if (jpg && jpg.size <= MAX_BYTES) return new File([jpg], 'logo.jpg', { type: 'image/jpeg' });
    }
  }
  return file;
}

/** Drop-in for <input type="file" name="logo">: resizes the chosen image before the form is submitted. */
export function LogoInput({ id, name = 'logo', className = 'input' }: { id: string; name?: string; className?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <>
      <input id={id} name={name} type="file" accept="image/png,image/jpeg,image/webp" className={className} disabled={busy}
        onChange={async (e) => {
          const input = e.currentTarget, f = input.files?.[0];
          if (!f || (f.size <= MAX_BYTES && f.type === 'image/webp')) return;
          setBusy(true);
          try {
            const small = await shrink(f);
            const dt = new DataTransfer(); dt.items.add(small); input.files = dt.files;
          } finally { setBusy(false); }
        }} />
      {busy && <small className="muted">מקטינים את התמונה…</small>}
    </>
  );
}
