# Autopilot files

`/autopilot` keeps four files in `docs/`. Create them from these templates on the first run. Agents append to them, the owner answers in `QUESTIONS.md`, and the next run picks the answers up.

## `docs/QUESTIONS.md`: only the owner can answer or do these

```markdown
# Questions and clicks for the owner
Answer by typing an x next to an option or a line under "Answer". The next /autopilot run applies it.

## Open
### 💳 P-002 (operator, ~2 min) Supabase Pro: $25/month, recurring
Unlocks: video storage over 1 GB and daily backups. Blocked until paid: media upload step. Free alternative: none suitable for launch.
Open: Chrome tab "Supabase - Billing" (or supabase.com/dashboard → Organization → Billing), press Upgrade, write "done".
Answer:

### Q-007 (product, blocks: funnel C build) Should the photo step be required?
Why we ask: on MoveMatch C's video went required, then back to optional.
- [ ] Optional, with a "better quotes with photos" hint (Recommended)
- [ ] Required
- [ ] Other: ...
Answer:

### C-003 (operator, ~2 min) Twilio Trust Hub: press Submit
Open the Chrome tab "Trust Hub - Business profile" (or console.twilio.com → Trust Hub → Customer profiles), check the details, press Submit, write "done".
Answer:

## Answered (moved to DECISIONS.md by the next run)
```

## `docs/DECISIONS.md`: what was decided, by whom, and how to undo it

```markdown
| # | Date | Stage | Decision | By | Why | If you disagree |
|---|---|---|---|---|---|---|
| D-012 | 2026-11-21 | design | Hero uses a phone photo, not illustration | Assumed (autopilot) | Recommended; matches MoveMatch's best-converting design | Swap image in `/public/hero.jpg`, 10 min |
```

## `docs/OPS-LOG.md`: every change made in an external tool

```markdown
| Date | Tool | Where | Change (old → new) | Undo | Verified |
|---|---|---|---|---|---|
| 2026-11-21 | Twilio | Sender +972..., Webhook | Inbound URL: (none) → https://<domain>/api/twilio/inbound?k=… | Clear the field | Yes: test POST reached Vercel logs |
```
Never write secret values here. Write only the variable name and where it was set.

## `docs/DIGEST-YYYY-MM-DD.md`: the morning report
Sections: summary, waiting for you (sorted, with minutes), decided for you, done, health (WhatsApp quality rating, Twilio errors, deploys), next run.
