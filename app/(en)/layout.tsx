import type { Metadata, Viewport } from 'next';
import { RootShell } from '@/components/RootShell';
import { t } from '@/lib/i18n';

/** Root layout for the English site (/en/…): <html lang="en" dir="ltr">, so every page lays out left to right. */
const M = t('en').meta;
export const metadata: Metadata = {
  metadataBase: new URL('https://movematch.co.il'),
  title: M.title,
  description: M.description,
  openGraph: { title: M.ogTitle, description: M.ogDescription, locale: 'en_US', type: 'website' },
  robots: { index: true, follow: true },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#f2f2f3' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <RootShell locale="en">{children}</RootShell>;
}
