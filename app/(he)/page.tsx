import { ThemedLanding } from '@/components/themed/ThemedLanding';
import { alternates } from '@/lib/i18n/alternates';
export const metadata = { alternates: alternates('/', '/en') };
/**
 * Homepage (/): funnel D, realistic-photo theme. Same page as /d/photo, but for now it is the owner's test area:
 * its leads go to the client and the operator as usual but are not sent to movers (lib/qa.ts, migration 023).
 * To make it live: HOME_LEADS_LIVE=1 in Vercel. See PAGES.md for the full map.
 */
export default function Page() { return <ThemedLanding funnel="d" theme="photo" entry="home" />; }
