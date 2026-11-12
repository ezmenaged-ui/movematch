import { Truck } from 'lucide-react';

/** Mover logo, or a monogram tile when there is none. */
export function MoverLogo({ id, hasLogo, name, size = 56 }: { id: string | null; hasLogo: boolean; name: string; size?: number }) {
  if (id && hasLogo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="mv-logo" src={`/api/movers/${id}/logo`} alt={name} width={size} height={size} style={{ width: size, height: size }} />;
  }
  const letter = name.trim().replace(/^הובלות\s+/, '').charAt(0);
  return (
    <span className="mv-logo mv-mono" style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden>
      {letter || <Truck size={size * 0.45} strokeWidth={1.5} />}
    </span>
  );
}
