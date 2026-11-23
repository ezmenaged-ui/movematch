import { ThemedLanding } from '@/components/themed/ThemedLanding';
import { alternates } from '@/lib/i18n/alternates';
export const metadata = { alternates: alternates('/d/photo', '/en/d/photo') };
/** Funnel D in English (photo design). Continues to /en/d/steps. */
export default function Page() { return <ThemedLanding funnel="d" theme="photo" locale="en" />; }
