# <PROJECT NAME>: notes for Claude

<One line: Hebrew RTL services marketplace for <service> in Israel. Domain, Vercel project, Supabase project ref and schema go here once created.>

Built with the MoveMatch starter kit. Read `docs/PLAYBOOK.md` before any work. Page map: `PAGES.md`. Tracking: `docs/TRACKING.md`. Briefs: `docs/briefs/`.

## How we work (gated stages)
Run `/kickoff` to start or resume, or `/autopilot` when the owner is away. Stages: entrepreneur → bizdev → product → design → marketing → developer → QA, with ops-legal starting right after the entrepreneur stage because approvals take days. Each stage asks the owner its questions (AskUserQuestion, max 4 per round, recommended option first, plain words), writes a brief, and waits for the owner's approval before the next stage starts. Agent definitions: `.claude/agents/`.

## Owner preferences
- Ask multiple-choice questions when anything is unclear; never fill gaps with filler.
- Plain words. If the owner says "I don't understand", rephrase in business terms.
- Console tasks (Twilio, Meta, Google, Vercel): one screen at a time; ask for a screenshot; say which field gets which value and which button to press.
- Never ask for secrets in chat; say where to paste them.
- Explain the consequence of a deploy before asking for the OK.
- Owner's personal name must not appear on the site: <yes/no>.
- Autonomy level: <green + pre-launch yellow | green only>; also set in `.claude/autonomy.json` (`prelaunch` / `live`). Spend cap without asking: <₪/month>. Red actions (payments, enabling ads, messages to real people, identity/legal submits, production deletes, post-launch production deploys, account security) always wait for the owner. See `docs/PLAYBOOK.md` 20.5.
- Morning report: <digest only | digest + push | digest + email draft>.

## Agents do the console work
Use connectors and APIs first and the owner's logged-in Chrome second (the `operator` agent). Don't hand the owner console steps they don't need to do. Prepare owner-only steps to the last click and queue them in `docs/QUESTIONS.md`. Log every external change in `docs/OPS-LOG.md`. Secrets go from the console straight into Vercel env vars and never into files or chat. When the owner is away, use `/autopilot`.

Business documents folder: <path>. Consoles logged in for the agents: <list, see docs/OWNER-PREFLIGHT.md>.

## Owner test numbers
<list every phone number the owner and family use for tests; all are exempt from the phone cooldown and are the only numbers allowed in tests>

## QA rules (mandatory before any test that creates leads, quotes or messages)
Background: on MoveMatch a production QA run sent 40 WhatsApp templates in 52 seconds, including to made-up numbers, and Meta disabled the WhatsApp Business account. The owner had approved the fake numbers. These rules hold even if the owner says otherwise.
0. Use `/qa` for manual tests: nothing is sent except the lead email to the operator.
1. Prefer local QA (`next build && next start` against the same DB; no Twilio/Gmail credentials, so nothing can send).
2. Every test lead is a test lead: name starts with `QA ` and/or `?utm_source=qa`. The guard (`isTestLead`) means no WhatsApp to anyone and nothing to providers. Never remove or bypass it.
3. Only the owner test numbers above. Never made-up numbers.
4. Production tests: one funnel at a time, at least 2 minutes apart, no loops or retries. Keep the per-recipient throttle on.
5. Test WhatsApp itself only when the number is healthy: one message to the owner, then check the Twilio log.
6. Only real providers with real WhatsApp numbers may be active. Test/demo providers stay `active = false`.
7. Ask before cleanup deletes and before production deploys; show what will change.
8. After any QA: check Twilio error codes (63005, 63016, 63024, 63049, 63051) and server logs, then delete the QA leads with approval.

## WhatsApp rules
- Message only people who opted in; honour "הסר"/STOP at once.
- Transactional = Utility templates; the link is written in the template body, never a whole URL in a variable.
- No bursts, identical repeats, invalid numbers or retries. Warm up new numbers; check the quality rating weekly.
- Every WhatsApp alert has an SMS backup. Kill switch: `MESSAGES_PAUSED=1`.
- The customer must send the first message; the bot only answers inside the 24-hour window and never sends templates from the chat.

## Release rules
- One chat deploys at a time. Every change goes through a PR into `main`; `main` = production.
- Merge the latest `main` before deploying; after deploying, verify the changed pages on the live domain and say what wasn't verified.
- Keep `PAGES.md`, `docs/TRACKING.md` and this file updated in the same PR as the change.
