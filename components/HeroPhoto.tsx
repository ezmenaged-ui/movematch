import { TruckScene } from './Illustrations';

/** Hero visual. Defaults to the brand truck illustration on white.
 *  To use a licensed photo instead: put it in /public and set NEXT_PUBLIC_HERO_IMAGE=/hero.jpg. */
export function HeroPhoto({ strip = false }: { strip?: boolean }) {
  const src = process.env.NEXT_PUBLIC_HERO_IMAGE;
  if (src) {
    return (
      <div className="photo" style={{ position: 'relative' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="משאית הובלה" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} fetchPriority={strip ? 'auto' : 'high'} />
      </div>
    );
  }
  return <div className="photo art"><TruckScene compact={strip} /></div>;
}
