# MoveMatch: notes for Claude

Hebrew RTL Next.js site on Vercel (project `movematch`, domain movematch.co.il) with Supabase (project ref `yhixrtzidvjfwdynapqp`, schema `movematch`).
Page map: `PAGES.md`. Database changes: `supabase/migrations/`.

## QA rules (mandatory: read before any test that creates leads, offers or messages)

On 12 Nov 2026 a QA run of all 8 funnels on production sent **40 WhatsApp templates in 52 seconds** from a brand-new sender:
23 to one person, 6 to a number with no WhatsApp, and Marketing-category templates to people who had never written to the number.
Meta **disabled the WhatsApp Business account** (998316793318931, sender +972533891029) for "breach of Terms of Acceptable Use".
These rules exist so that never happens again.

1. **Prefer local QA.** Run the site locally (`next build && next start`) against the same database. Locally there are no Twilio/Gmail
   credentials, so nothing is sent. Run production funnel tests only when the owner asks for them.
2. **Every test lead must be a test lead.** Use a name starting with `QA` (e.g. `QA משפך B צילום`) and/or `?utm_source=qa`.
   `lib/qa.ts` (`isTestLead`) then guarantees: **no WhatsApp to anyone, no message of any kind to movers**; the client "tender opened"
   and the operator alert go by **SMS only**. Never remove or bypass this guard, and never test with a non-QA name.
3. **Client phone in tests = the owner's number 054-6677361** (it is exempt from the 30-day duplicate rule). Never use made-up
   numbers: they can belong to real people, and messages to numbers without WhatsApp are a spam signal.
4. **Pace production tests.** At most one funnel at a time with at least 2 minutes between submissions; never loop or retry sends.
   `lib/whatsapp.ts` also throttles to 4 WhatsApp messages per recipient per 10 minutes (`mm_wa_allow`), and that must stay on.
5. **Testing WhatsApp itself** (only after the owner says the number is healthy): one message, to the owner's number, then check
   the Twilio log (`api.twilio.com` Messages) before sending anything else. Never test WhatsApp by submitting funnels.
6. **Mover roster hygiene.** Only real movers with real WhatsApp numbers may be active. Test/fake movers stay `active = false`.
7. **Ask before cleanup deletes** and before production deploys; show the owner what will change.
8. **After any QA**: check the Twilio log for error codes (63005 content rejected, 63016 template not approved/outside window,
   63024 no WhatsApp, 63049 Meta declined marketing, 63051 sender locked) and Vercel logs, then delete the QA leads (with approval).

## WhatsApp rules we follow (Meta)

- Message only people who opted in (consent text is on every form), and honour "הסר"/STOP at once (`app/api/twilio/inbound`).
- Transactional messages use **Utility** templates; Marketing is only for promotions (it has hidden per-user caps and stricter review).
  `mm_mover_new_lead_v2` and `mm_client_first_offer_v2` are the Utility replacements, with the link written in the template text
  rather than in a variable. They switch on when `TWILIO_TPL_MOVER_LEAD_V2` / `TWILIO_TPL_CLIENT_FIRST_V2` are set (after Meta approval).
- Avoid spam signals: bursts, identical repeats, invalid numbers, retries, and URLs inside template variables.
- New or restored numbers: warm up. Real contacts message the number first, then volume grows slowly with real leads.
  Watch the quality rating in WhatsApp Manager.
- Every WhatsApp alert has an SMS backup (immediate on refusal, or via `/api/twilio/status` when Meta reports undelivered).
