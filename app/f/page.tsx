import { ThemedLanding } from '@/components/themed/ThemedLanding';
/**
 * /f: funnel E's photo landing page with a WhatsApp option at the top of the lead card.
 * The form below it is E's form (same lead, validation, consent, attribution and GA4 events; it continues to /e/steps).
 * The green button opens a chat with the business number, starter prefilled (components/themed/WhatsAppCta.tsx).
 */
export default function Page() { return <ThemedLanding funnel="e" theme="photo" whatsapp />; }
