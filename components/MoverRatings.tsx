import { Star } from 'lucide-react';
import type { TenderOffer } from '@/lib/tender';

const n = (x: number | null) => (x === null || x === undefined ? null : Number(x));

/** Google (out of 5) and Midrag (out of 10) ratings with review counts, linking to the source when a URL is set. */
export function MoverRatings({ o, compact = false }: { o: TenderOffer; compact?: boolean }) {
  const items = [
    { key: 'google', label: 'Google', rating: n(o.google_rating), outOf: 5, reviews: o.google_reviews, url: o.google_url },
    { key: 'midrag', label: 'מדרג', rating: n(o.midrag_rating), outOf: 10, reviews: o.midrag_reviews, url: o.midrag_url },
  ].filter((r) => r.rating !== null);
  if (!items.length) return null;
  return (
    <div className={`mv-ratings ${compact ? 'compact' : ''}`}>
      {items.map((r) => {
        const body = (
          <>
            <Star size={compact ? 13 : 15} strokeWidth={0} fill="currentColor" className="mv-star" aria-hidden />
            <span dir="ltr"><b>{r.rating!.toFixed(1)}</b><span className="mv-of">/{r.outOf}</span></span>
            <span className="mv-src">{r.label}</span>
            {r.reviews ? <span className="mv-rev">({r.reviews.toLocaleString('he-IL')} ביקורות)</span> : null}
          </>
        );
        return r.url && !compact
          ? <a key={r.key} className="mv-rating" href={r.url} target="_blank" rel="noreferrer">{body}</a>
          : <span key={r.key} className="mv-rating">{body}</span>;
      })}
    </div>
  );
}
