import { he } from './he';

/**
 * Site languages. Today only Hebrew is live. To add a language:
 *   1. copy ./he.ts to ./<code>.ts and translate the values (the `Dict` type makes sure no key is missing),
 *   2. add it to DICTS and LOCALES below (dir 'ltr' for English/Russian, 'rtl' for Arabic),
 *   3. add a route (e.g. app/en/…) that renders the landing with `locale="<code>"`.
 * Landing components read text only through `t(locale)`, and the CSS uses logical properties (inline-start/end),
 * so the layout mirrors by itself when `dir` is ltr. Form validation messages, the funnel steps, emails and WhatsApp
 * templates are still Hebrew-only.
 */
export type Dict = typeof he;
export type Locale = 'he';

export const DEFAULT_LOCALE: Locale = 'he';
export const LOCALES: Record<Locale, { lang: string; dir: 'rtl' | 'ltr'; og: string }> = {
  he: { lang: 'he', dir: 'rtl', og: 'he_IL' },
};
const DICTS: Record<Locale, Dict> = { he };

export function t(locale: Locale = DEFAULT_LOCALE): Dict {
  return DICTS[locale] ?? DICTS[DEFAULT_LOCALE];
}
