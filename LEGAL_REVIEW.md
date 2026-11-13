# Legal texts awaiting review by an Israeli lawyer

**Status: NOT approved for go-live.** All Hebrew legal text below was drafted on 13 Nov 2026 (branch
`claude/movematch-legal-copy-matching-2j18yk`) and must be reviewed by an Israeli lawyer before it is deployed to production.

Operator: אדטק, מרטק ייעוץ בע״מ, ח.פ. 517038543, הפורצים 10, ירושלים · legal@admarkgrowth.com · WhatsApp 053-389-1029.
All operator details come from one place: `lib/legal.ts`.

## Pages to review

| Page | File | What is new |
|---|---|---|
| `/terms` | `app/terms/page.tsx` | Rewritten. New: operator identity, age/capacity (§2), accurate details + impersonation + 30-day rule (§4), prohibited conduct (§5), user-content licence (§6), IP (§7), no endorsement + what we vet (§8), release after the deal (§9), cancellations + closing an open tender (§10), ₪50 promotion with the 3-minute video condition (§11), third-party links (§13), indemnity (§15), changes to terms (§17), Israeli law + Jerusalem courts (§18). Mover clauses moved out to `/movers/terms`. |
| `/movers/terms` | `app/movers/terms/page.tsx` | New mover agreement (version `2026-11-13`): approval and vetting, service areas and routing, WhatsApp consent and display licence, ₪50 discount given by the mover, 10% commission on the price **after** the discount, confidentiality, prohibited use, liability and indemnity, termination, changes, Jerusalem courts. |
| `/privacy` | `app/privacy/page.tsx` | New: transfers abroad with countries and safeguards (§4), tracking technologies with GA4 / Google tag / Google Ads / Meta Pixel and opt-out links (§5), security measures and breach handling incl. Amendment 13 (§7), mover service areas used for matching (§1–2), privacy contact (§10). |
| `/accessibility` | `app/accessibility/page.tsx` | Removed "full audit planned" and "may not be fully accessible". Added the automated check (axe, 13 Nov 2026), coordinator contact, 14-day response time. |
| `/movers/join` | `components/MoverSignupForm.tsx` | Two checkboxes: (a) WhatsApp + display consent with "הסר" opt-out; (b) acceptance of the mover agreement, with the commission sentence verbatim and the link "לתנאים המלאים לחצו כאן". |

## Points for the lawyer to decide

1. **Supabase country (privacy §4)**: still blank. The owner must read it in Supabase → Project Settings → General and set
   `LEGAL.hosting.supabase` in `lib/legal.ts`. Until then the page says only "מחוץ לישראל".
   Vercel functions run in `iad1` (Washington DC, USA), checked in the Vercel project settings on 13 Nov 2026.
2. **Safeguards wording (privacy §4)**: describes what the providers publish (DPAs, SCCs, SOC 2 / ISO 27001, encryption). Confirm this is enough under the 2001 transfer regulations, or whether explicit consent should also be taken on the forms.
3. **Breach notification (privacy §7)**: worded as "notify the Authority / affected people when the law or the Authority requires", including Amendment 13. Confirm the wording matches current obligations.
4. **Accessibility**: the check was automated only (axe, WCAG 2.0/2.1 A + AA) on public pages. Pages that need a live lead (`/b/steps`, `/c/details`, `/d/steps`, `/t/…`, `/l/…`) and the mover/admin panels were not scanned. Confirm whether the statement may say the site "was adapted" on that basis, or whether a manual audit is needed first.
5. **₪50 promotion**: the funnel D copy still says "מצלמים סרטון? מקבלים 50 ₪ הנחה" (owner decision: no site copy change for now). The terms add the 3-minute condition. Confirm the short ad copy is not misleading without it.
6. **Commission after discount**: the mover agreement defines the final price as after the ₪50 discount, before VAT.
7. **Jurisdiction**: exclusive jurisdiction in Jerusalem for customers too. Check enforceability against consumers.
8. **Ratings claim** ("כל המובילים מדורגים", "rated by real customers"): left as is by owner decision.
