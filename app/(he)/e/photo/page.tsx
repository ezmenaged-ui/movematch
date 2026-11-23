import { ThemedLanding } from '@/components/themed/ThemedLanding';
import { alternates } from '@/lib/i18n/alternates';
export const metadata = { alternates: alternates('/e/photo', '/en/e/photo') };
/** Funnel E, realistic-photo theme: same wizard as D, but one information page where the client picks a 3-minute video or an item list. */
export default function Page() { return <ThemedLanding funnel="e" theme="photo" />; }
