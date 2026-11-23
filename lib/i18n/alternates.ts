import type { Metadata } from 'next';

/** <link rel="alternate" hreflang> for a page that exists in both languages: tells Google the two are translations. */
export const alternates = (hePath: string, enPath: string): Metadata['alternates'] => ({
  languages: { he: hePath, en: enPath, 'x-default': hePath },
});
