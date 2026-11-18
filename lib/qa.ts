/**
 * Test mode (QA). A lead is a test lead when its name starts with "QA", it came in with ?utm_source=qa,
 * or it came in through the /qa test area (entry = 'qa').
 * Test leads never send WhatsApp to anyone and never message movers (WhatsApp or SMS). The client "tender opened"
 * and the operator alert go by SMS only (to the test phone / the operator), so the SMS path is still exercised.
 * Why: on 12 Nov 2026 a production QA run sent 40 WhatsApp templates in 52 seconds and Meta disabled the account.
 * See CLAUDE.md → "QA rules".
 */
type L = { name?: string | null; utm_source?: string | null; entry?: string | null } | null | undefined;

export const isTestLead = (l: L) =>
  !!l && (/^\s*QA\b/i.test(l.name || '') || (l.utm_source || '').trim().toLowerCase() === 'qa' || l.entry === 'qa');

/** /qa test area: nothing goes out by WhatsApp or SMS at all, to anyone. The operator still gets the lead email. */
export const isQaEntry = (l: L) => !!l && l.entry === 'qa';

/**
 * Homepage (/) while it is the owner's test area: the client and the operator get their usual messages,
 * but movers are not alerted (and real movers don't see the lead in their panel, migration 023).
 */
export const isHomeHeld = (l: L) => !!l && l.entry === 'home';

/** HOME_LEADS_LIVE=1 in Vercel makes the homepage a live funnel (its new leads go to movers like /d/photo). */
export const homeLeadsLive = () => ['1', 'true', 'yes', 'on'].includes((process.env.HOME_LEADS_LIVE || '').trim().toLowerCase());
