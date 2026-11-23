'use client';
import { createContext, useContext } from 'react';
import { DEFAULT_LOCALE, t, type Locale } from '@/lib/i18n';

/** The page language for client components. Set once per root layout (components/RootShell.tsx). */
const Ctx = createContext<Locale>(DEFAULT_LOCALE);
export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <Ctx.Provider value={locale}>{children}</Ctx.Provider>;
}
export const useLocale = () => useContext(Ctx);
/** The dictionary for the page language (lib/i18n). */
export const useT = () => t(useContext(Ctx));
