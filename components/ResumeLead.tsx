'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Funnel, NEXT_PATH, saveHandoff } from '@/lib/handoff';
import { Spinner } from './ui';

export function ResumeLead({ funnel, lead }: { funnel: Funnel; lead: { id: string; token: string; name: string; phone: string; city: string | null } }) {
  const router = useRouter();
  useEffect(() => {
    saveHandoff({ funnel, ref: { id: lead.id, token: lead.token }, name: lead.name, phone: lead.phone, city: lead.city || '' });
    router.replace(NEXT_PATH[funnel]);
  }, [funnel, lead, router]);
  return <main style={{ padding: 48, display: 'grid', placeItems: 'center' }}><Spinner /></main>;
}
