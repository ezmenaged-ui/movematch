import { ThemedLanding } from '@/components/themed/ThemedLanding';
import { alternates } from '@/lib/i18n/alternates';
export const metadata = { alternates: alternates('/', '/en') };
/**
 * English homepage (/en): funnel D, photo design, like the Hebrew homepage (/). Its leads are held from movers the same way
 * until HOME_LEADS_LIVE=1 (entry 'home', lib/qa.ts). Leads are saved with lang 'en'.
 */
export default function Page() { return <ThemedLanding funnel="d" theme="photo" entry="home" locale="en" />; }
