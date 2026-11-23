import { notFound } from 'next/navigation';
import { ThemedLanding } from '@/components/themed/ThemedLanding';
import type { Funnel } from '@/lib/handoff';

/** /qa/<funnel>/<theme>: the same landing page as /<funnel>/<theme>, in the test area (nothing is sent, see lib/qa.ts). */
export const metadata = { title: 'MoveMatch · סביבת בדיקות', robots: { index: false, follow: false } };
const FUNNELS = ['a', 'b', 'c', 'd', 'e'] as const;
const THEMES = ['photo', 'art'] as const;
export const dynamicParams = false;
export function generateStaticParams() { return FUNNELS.flatMap((funnel) => THEMES.map((theme) => ({ funnel, theme }))); }

export default async function Page({ params }: { params: Promise<{ funnel: string; theme: string }> }) {
  const { funnel, theme } = await params;
  if (!(FUNNELS as readonly string[]).includes(funnel) || !(THEMES as readonly string[]).includes(theme)) notFound();
  return <ThemedLanding funnel={funnel as Funnel} theme={theme as 'photo' | 'art'} entry="qa" />;
}
