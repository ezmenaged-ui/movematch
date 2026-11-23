/** How movers and the operator are told that a client came from the English site (lead.lang = 'en'). Hebrew, for movers. */
export const EN_TAG = '🇬🇧 הלקוח/ה דובר/ת אנגלית';
export const isEnLead = (l: { lang?: string | null } | null | undefined) => l?.lang === 'en';
