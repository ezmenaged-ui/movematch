import { Wizard } from '@/components/Wizard';
import { t } from '@/lib/i18n';
export const metadata = { title: t('en').meta.steps, robots: { index: false } };
/** Funnel D's steps in English (the Wizard reads the language from the English root layout). */
export default function Page() { return <Wizard funnel="d" />; }
