/** Business details used on the legal pages. */
export const LEGAL = {
  brand: 'MoveMatch',
  entity: 'אדטק, מרטק ייעוץ בע״מ (Adtech Martech Consulting Ltd.)',
  entityShort: 'אדטק, מרטק ייעוץ בע״מ',
  companyId: '517038543', // ח.פ.
  address: 'הפורצים 10, ירושלים',
  email: 'legal@admarkgrowth.com',
  whatsapp: '972533891029',
  whatsappDisplay: '053-389-1029',
  updated: '13.11.2026',
  /** Version of the mover agreement (/movers/terms) a mover accepts at sign-up (stored on the mover row). Bump when it changes. */
  moverTermsVersion: '2026-11-13',
  /** Where our providers keep data (privacy policy, "transfers abroad").
   *  Vercel: checked in the project settings (functions in iad1 = Washington DC, USA).
   *  Supabase: TODO owner: read the region in Supabase → Project Settings → General and write the country here
   *  (e.g. 'גרמניה (פרנקפורט, האיחוד האירופי)' for eu-central-1, 'ארה״ב' for us-east-1). */
  hosting: {
    vercel: 'ארה״ב (וושינגטון)',
    supabase: 'גרמניה (פרנקפורט, האיחוד האירופי)', // eu-central-1, checked in Supabase project settings on 14.11.2026
  },
};
