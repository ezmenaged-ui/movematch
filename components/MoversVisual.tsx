import { ShieldCheck } from 'lucide-react';
import { MoversScene } from './Illustrations';

/** Flip to true once /public/movers-{600,1200}.webp exist (the MoveMatch movers photo). */
export const HAS_MOVERS_PHOTO = true;

const SRCSET = '/movers-600.webp 600w, /movers-1200.webp 1200w';

/** Desktop side picture beside the wizard form — standalone, no frame. */
export function MoversSide() {
  if (!HAS_MOVERS_PHOTO) return <div className="movers-side art"><MoversScene /></div>;
  return (
    <div className="movers-side">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/movers-1200.webp" srcSet={SRCSET} sizes="(min-width: 901px) 520px, 0px" width={1671} height={941}
        alt="המובילים של MoveMatch ליד המשאית" fetchPriority="high" />
    </div>
  );
}

/** Phone, step 1: a small faces crop beside the trust line (replaces the plain badge, ~same height). */
export function MoversTrustRow() {
  if (!HAS_MOVERS_PHOTO) return null;
  return (
    <div className="movers-trust">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/movers-faces.webp" alt="המובילים של MoveMatch" width={300} height={176} />
      <span><b>מובילים אמיתיים ומקצועיים</b><small><ShieldCheck size={14} strokeWidth={1.5} aria-hidden /> כל המובילים מדורגים</small></span>
    </div>
  );
}
