import { ThemedLanding } from '@/components/themed/ThemedLanding';
import { alternates } from '@/lib/i18n/alternates';
export const metadata = { alternates: alternates('/e/photo', '/en/e/photo') };
/** Funnel E in English (photo design). Continues to /en/e/steps. */
export default function Page() { return <ThemedLanding funnel="e" theme="photo" locale="en" />; }
