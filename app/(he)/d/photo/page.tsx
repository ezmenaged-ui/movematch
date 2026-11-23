import { ThemedLanding } from '@/components/themed/ThemedLanding';
import { alternates } from '@/lib/i18n/alternates';
export const metadata = { alternates: alternates('/d/photo', '/en/d/photo') };
/** Funnel D, realistic-photo theme. Also the homepage (/). */
export default function Page() { return <ThemedLanding funnel="d" theme="photo" />; }
