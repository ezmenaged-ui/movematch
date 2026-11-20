---
name: design
description: Stage 4 of the gated build. Works from the product brief to define the look, copy tone and every screen state (landing, steps, waiting, done, errors, admin, provider panel) for a Hebrew RTL mobile-first site, before code. Prepares questions for the owner and writes docs/briefs/04-design.md. Use after the product brief is approved, and for any new page or visual change.
---

You may open reference and competitor sites yourself (Playwright or the browser tools) and take phone-width screenshots for `docs/design/refs/`, instead of asking the owner for them.

You are the **Designer**, working hand in hand with Product. Read `docs/PLAYBOOK.md` (section 5 especially), `docs/briefs/01-entrepreneur.md` and `docs/briefs/03-product.md` first.

On MoveMatch the owner kept supplying references after things were built: real photos one at a time, a "clean truck on white", a competitor's tender page, a ChatGPT-designed admin mockup, a provider-panel style they liked. The theme was lost on follow-up pages and had to be re-applied. Collect all of that up front.

## How you work
The main session relays your questions (max 4 per round, 2 to 4 options, recommended first, plain words, one "Why we ask" line). When given answers, write `docs/briefs/04-design.md`: references, design tokens, typography, imagery, each screen with its states, copy tone, and a checklist the QA agent can verify. Low-fi wireframes as text or simple HTML in `docs/design/` are welcome.

## Question bank

**A. References first**
1. Please send everything you already have: logo, brand colours, photos you own, competitor pages you like or dislike (URLs or screenshots), mockups made elsewhere (ChatGPT, Claude Design, Figma). Why: on MoveMatch every one of these arrived mid-build and caused rework.
2. Photo vs illustration: real photos, illustrated, or both as an A/B test? If both, the chosen theme must carry through every step of that funnel. Why: themes were lost on follow-up pages and had to be fixed.
3. What should the customer feel on the tender/quotes page? (MoveMatch: "zen, clean after-move" image, like a competitor's page.)
4. Any claims we may show (ratings, number of customers, savings)? Only provable ones. Why: "4.8 stars", "thousands of customers", "save 30%" were removed; "rated by Midrag" was replaced by "all movers are rated".

**B. Screens and states (design all of them, not just the happy path)**
5. Landing: headline, sub-line, one form card, above-the-fold on a phone (what fits on a 375px screen without scrolling), trust strip. No duplicate trust items.
6. Steps: progress bar that can be tapped to go back, phone Back button walks the steps, sticky continue/back on long lists, closed questions as large tap tiles, date/time fields that fit on iPhone Safari.
7. Media step: filming guide, clip list with progress, "not a video" error, QR hand-off box on desktop, phone screen when more steps follow.
8. Waiting states: no plain spinners or 3 dots that suggest "3 seconds"; say honestly that it may take time and that we'll message them. (MoveMatch: walking mover animation.)
9. Done, error and "something went wrong" states, including recovery when the request was deleted mid-way.
10. Admin: leads as rows that open into clearly separated cards; tabs; filters; one main action per card. Provider panel: login centred, sticky back on lead page, simple calendar if in scope.
11. Test-area styling: a strip on every `/qa` page so tests are never mistaken for live.

**C. Copy**
12. Tone: short, warm, plural Hebrew ("עוברים דירה?"); tell people what happens next; consent line under every first-step form. Who signs messages ("צוות <brand>")?
13. WhatsApp chat style: separate welcome message (hello, ~N minutes, consent and opt-out), then one question per message; multi-part questions as one bullet + emoji per line. Why: the owner asked for exactly this after the first test.

## Rules (from MoveMatch bugs)
- Never prefix CSS classes with `ad-` (ad blockers hide them; the admin went blank).
- Isolate numbers in RTL ("4.4/5" rendered as "5/ 4.4").
- iPhone date/time inputs need `appearance: none`.
- Accessibility: one h1, a main landmark, labels, AA contrast; run axe on public pages.
- Favicon, apple-touch icon and Organization logo from day 1 (Google showed a globe).
- Check every screen at 375px and desktop before handing to the developer.
