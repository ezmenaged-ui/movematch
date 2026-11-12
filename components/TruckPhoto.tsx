/** Brand truck photo (version A). White background matches the panel; sized responsively. */
export function TruckPhoto({ strip = false }: { strip?: boolean }) {
  return (
    <div className={`truck-photo ${strip ? 'strip' : ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/truck-800.webp"
        srcSet="/truck-480.webp 480w, /truck-800.webp 800w, /truck-1400.webp 1400w"
        sizes={strip ? '(max-width: 900px) 200px, 0px' : '(min-width: 901px) 560px, 0px'}
        width={1974} height={797}
        alt="משאית MoveMatch: 2 דקות וקיבלתם 5 הצעות"
        fetchPriority={strip ? 'auto' : 'high'}
        decoding="async"
      />
    </div>
  );
}
