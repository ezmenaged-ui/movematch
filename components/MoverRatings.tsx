import { Star, ThumbsUp } from 'lucide-react';
import type { TenderOffer } from '@/lib/tender';

// A rating of 0 means "none" (empty sign-up fields), so it is not shown.
const n = (x: number | null | undefined) => (x === null || x === undefined || !Number(x) ? null : Number(x));

type Item = { key: string; label: string; score: string; outOf?: string; reviews: number | null; url: string | null; icon: 'star' | 'thumb' };

/**
 * The mover's ratings, only the ones they have: Google (stars out of 5), Midrag (out of 10) and Facebook (% who recommend).
 * Each links to its source when a URL is set. Nothing is shown for a source the mover has no rating on.
 */
export function MoverRatings({ o, compact = false }: { o: TenderOffer; compact?: boolean }) {
  const g = n(o.google_rating), m = n(o.midrag_rating), f = n(o.facebook_recommend);
  const items: Item[] = [
    g !== null && { key: 'google', label: 'Google', score: g.toFixed(1), outOf: '/5', reviews: o.google_reviews, url: o.google_url, icon: 'star' as const },
    m !== null && { key: 'midrag', label: 'מדרג', score: m.toFixed(1), outOf: '/10', reviews: o.midrag_reviews, url: o.midrag_url, icon: 'star' as const },
    f !== null && { key: 'facebook', label: 'Facebook', score: `${Math.round(f)}%`, outOf: ' ממליצים', reviews: o.facebook_reviews, url: o.facebook_url, icon: 'thumb' as const },
  ].filter(Boolean) as Item[];
  if (!items.length) return null;
  const size = compact ? 13 : 15;
  return (
    <div className={`mv-ratings ${compact ? 'compact' : ''}`}>
      {items.map((r) => {
        const body = (
          <>
            {r.icon === 'star'
              ? <Star size={size} strokeWidth={0} fill="currentColor" className="mv-star" aria-hidden />
              : <ThumbsUp size={size} strokeWidth={0} fill="currentColor" className="mv-thumb" aria-hidden />}
            <span><b dir="ltr">{r.score}</b><span className="mv-of" dir={r.icon === 'star' ? 'ltr' : undefined}>{r.outOf}</span></span>
            <span className="mv-src">{r.label}</span>
            {r.reviews ? <span className="mv-rev">({Number(r.reviews).toLocaleString('he-IL')} ביקורות)</span> : null}
          </>
        );
        return r.url && !compact
          ? <a key={r.key} className="mv-rating" href={r.url} target="_blank" rel="noreferrer">{body}</a>
          : <span key={r.key} className="mv-rating">{body}</span>;
      })}
    </div>
  );
}
