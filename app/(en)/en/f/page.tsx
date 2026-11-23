import { ThemedLanding } from '@/components/themed/ThemedLanding';
import { alternates } from '@/lib/i18n/alternates';
export const metadata = { alternates: alternates('/f', '/en/f') };
/** /en/f: funnel E in English with the WhatsApp option in the lead card; the chat it opens runs in English (lib/waFunnel.ts). */
export default function Page() { return <ThemedLanding funnel="e" theme="photo" whatsapp locale="en" />; }
