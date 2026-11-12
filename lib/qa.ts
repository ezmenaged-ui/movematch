/**
 * Test mode (QA). A lead is a test lead when its name starts with "QA" or it came in with ?utm_source=qa.
 * Test leads never send WhatsApp to anyone and never message movers (WhatsApp or SMS). The client "tender opened"
 * and the operator alert go by SMS only (to the test phone / the operator), so the SMS path is still exercised.
 * Why: on 12 Nov 2026 a production QA run sent 40 WhatsApp templates in 52 seconds and Meta disabled the account.
 * See CLAUDE.md → "QA rules".
 */
export const isTestLead = (l: { name?: string | null; utm_source?: string | null } | null | undefined) =>
  !!l && (/^\s*QA\b/i.test(l.name || '') || (l.utm_source || '').trim().toLowerCase() === 'qa');
