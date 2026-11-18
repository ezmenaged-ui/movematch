import { Star, ThumbsUp } from 'lucide-react';
import type { TenderOffer } from '@/lib/tender';

// A rating of 0 means "none" (empty sign-up fields), so it is not shown.
const n = (x: number | null | undefined) => (x === null || x === undefined || !Number(x) ? null : Number(x));

type Item = { key: string; label: string; score: string; outOf?: string; reviews: number | null; url: string | null; icon: 'star' | 'thumb' };
type Rated = Pick<TenderOffer, 'google_url' | 'google_rating' | 'google_reviews' | 'midrag_url' | 'midrag_rating' | 'midrag_reviews' | 'facebook_url' | 'facebook_recommend' | 'facebook_reviews'>;
/** Ratings from other sites (e.g. "המקצוענים"), kept in the public profile. */
export type ExtraRating = { label: string; score: string; out_of?: string; reviews?: number; url?: string };

/**
 * The mover's ratings, only the ones they have: Google (stars out of 5), Midrag (out of 10) and Facebook (% who recommend),
 * plus any extra ratings from the public profile. Each links to its source when a URL is set.
 */
export function MoverRatings({ o, compact = false, extra = [] }: { o: Rated; compact?: boolean; extra?: ExtraRating[] }) {
  const g = n(o.google_rating), m = n(o.midrag_rating), f = n(o.facebook_recommend);
  const items: Item[] = [
    g !== null && { key: 'google', label: 'Google', score: g.toFixed(1), outOf: '/5', reviews: o.google_reviews, url: o.google_url, icon: 'star' as const },
    m !== null && { key: 'midrag', label: 'מדרג', score: m.toFixed(1), outOf: '/10', reviews: o.midrag_reviews, url: o.midrag_url, icon: 'star' as const },
    f !== null && { key: 'facebook', label: 'Facebook', score: `${Math.round(f)}%`, outOf: ' ממליצים', reviews: o.facebook_reviews, url: o.facebook_url, icon: 'thumb' as const },
    ...extra.filter((x) => x?.label && x?.score).map((x, i) => ({
      key: `x${i}`, label: x.label, score: x.score, outOf: x.out_of, reviews: x.reviews ?? null,
      url: x.url && /^https:\/\//.test(x.url) ? x.url : null, icon: 'star' as const,
    })),
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
            {/* Stars read "4.4/5" left to right as one unit; Facebook reads "100% ממליצים" in Hebrew order. */}
            <span dir={r.icon === 'star' ? 'ltr' : undefined}><b dir="ltr">{r.score}</b><span className="mv-of">{r.outOf}</span></span>
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
