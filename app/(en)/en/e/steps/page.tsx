import { Wizard } from '@/components/Wizard';
import { t } from '@/lib/i18n';
export const metadata = { title: t('en').meta.steps, robots: { index: false } };
/** Funnel E's steps in English. */
export default function Page() { return <Wizard funnel="e" />; }
