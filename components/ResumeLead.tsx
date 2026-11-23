'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Funnel, NEXT_PATH, saveHandoff } from '@/lib/handoff';
import { Spinner } from './ui';
import { lp } from '@/lib/i18n';
import { useLocale } from './Locale';

export function ResumeLead({ funnel, lead }: { funnel: Funnel; lead: { id: string; token: string; name: string; phone: string; city: string | null } }) {
  const router = useRouter();
  const locale = useLocale();
  useEffect(() => {
    saveHandoff({ funnel, ref: { id: lead.id, token: lead.token }, name: lead.name, phone: lead.phone, city: lead.city || '' });
    router.replace(lp(locale, NEXT_PATH[funnel]));
  }, [funnel, lead, router, locale]);
  return <main style={{ padding: 48, display: 'grid', placeItems: 'center' }}><Spinner /></main>;
}
