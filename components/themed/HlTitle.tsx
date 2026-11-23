import { Swoosh } from './Logo';

/**
 * A heading with the swoosh under its key words (parts come from lib/i18n). Each part is its own element, so a page
 * translator (Chrome Translate) can reorder words without gluing them together or breaking React.
 */
export function HlTitle({ parts }: { parts: { before: string; hl: string; after: string } }) {
  return <>{parts.before && <span>{parts.before}</span>}<span className="lp-hl">{parts.hl}<Swoosh /></span>{parts.after && <span>{parts.after}</span>}</>;
}
