import { he } from './he';
import { en } from './en';

/**
 * Site languages: Hebrew (every URL outside /en, right to left) and English (/en/…, left to right).
 * Each language has its own root layout (app/(he)/layout.tsx, app/(en)/layout.tsx), so <html lang dir> is right from the
 * first byte. Client components read the language with useLocale() / useT() (components/Locale.tsx); server components
 * get a `locale` prop. The CSS uses logical properties (inline-start / inline-end), so layouts mirror by themselves.
 *
 * To add a language: copy ./he.ts to ./<code>.ts (the `Dict` type flags missing keys), add it to DICTS and LOCALES,
 * and add a route group app/(<code>)/<code>/… with its own layout (see app/(en)).
 *
 * Whatever the page language, saved values stay the same (city names in Hebrew, option codes like 'p10'), so movers,
 * routing by area and /admin work unchanged. Leads from the English site are saved with lang = 'en'.
 */
export type Dict = typeof he;
export type Locale = 'he' | 'en';

export const DEFAULT_LOCALE: Locale = 'he';
export const LOCALES: Record<Locale, { lang: string; dir: 'rtl' | 'ltr'; og: string; prefix: string }> = {
  he: { lang: 'he', dir: 'rtl', og: 'he_IL', prefix: '' },
  en: { lang: 'en', dir: 'ltr', og: 'en_US', prefix: '/en' },
};
const DICTS: Record<Locale, Dict> = { he, en };

export function t(locale: Locale = DEFAULT_LOCALE): Dict {
  return DICTS[locale] ?? DICTS[DEFAULT_LOCALE];
}

/** A site path in this language: lp('en', '/d/steps') → '/en/d/steps'; lp('he', …) leaves it as is. */
export const lp = (locale: Locale, path: string) => `${LOCALES[locale].prefix}${path === '/' && LOCALES[locale].prefix ? '' : path}`;

/** In the browser, the page language (from <html lang>). For code outside React (lib/client.ts). */
export const pageLocale = (): Locale => (typeof document !== 'undefined' && document.documentElement.lang === 'en' ? 'en' : 'he');
