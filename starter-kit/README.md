# Services marketplace starter kit (from MoveMatch)

A team of nine Claude Code agents, a gated process and an unattended mode, for building the next lead marketplace (painters, cleaners, AC technicians...) faster than MoveMatch. On MoveMatch most of the product was discovered as we went: the original brief was one line, and funnels, video rules, access questions, abandonment emails, the test area, the kill switch, legal texts, tracking and the WhatsApp chat all came on days 3 to 12. These agents ask those questions on day 1, and the `operator` agent does the console work (Vercel, Supabase, Twilio, Meta, GA4, Google Ads) in your logged-in Chrome instead of sending you screenshots to follow.

## What's inside

| Path | What it is |
|---|---|
| `.claude/agents/entrepreneur.md` | Stage 1. The hard business questions: promise, money, supply, identity, autonomy |
| `.claude/agents/bizdev.md` | Stage 2. Providers: vetting, areas, what they need to quote, terms, logins |
| `.claude/agents/ops-legal.md` | Starts after stage 1, runs in parallel. Domain, email, Supabase, Twilio, Meta, templates, legal pages |
| `.claude/agents/product.md` | Stage 3. Funnels and their hypotheses, the full question list, tender rules, message map, admin, scope |
| `.claude/agents/design.md` | Stage 4. References, every screen state, copy tone, RTL/mobile rules |
| `.claude/agents/marketing.md` | Stage 5. Claims, channels, geo, variants, tracking plan, ad brief, launch tracker |
| `.claude/agents/developer.md` | Stage 6. Build order, what to reuse from MoveMatch, release rules |
| `.claude/agents/qa.md` | Stage 7. Safety rules it refuses to break, checklists, go / no-go |
| `.claude/agents/operator.md` | Any stage. The hands: console and account work through connectors, APIs and your Chrome; logs every change; queues only owner-only clicks |
| `.claude/commands/kickoff.md` | `/kickoff`: runs the stages in order with approval gates |
| `.claude/commands/autopilot.md` | `/autopilot`: runs without you (overnight), then writes a morning digest. `/autopilot preflight` checks every login |
| `.claude/settings.json` | Permissions so unattended runs don't stall on prompts, plus the guard hook |
| `.claude/hooks/guard.mjs` | Blocks pushes to `main`, force pushes, CLI production deploys, real Twilio sends and destructive SQL, even in Auto mode |
| `.claude/autonomy.json` | `prelaunch` (agents may merge and deploy before launch) or `live` (merges need you). Switch on launch day |
| `docs/OWNER-PREFLIGHT.md` | Your one-hour checklist before letting agents work alone |
| `docs/autopilot/README.md` | Templates for `QUESTIONS.md`, `DECISIONS.md`, `OPS-LOG.md` and the daily digest |
| `CLAUDE.md` | Project rules template (fill in the placeholders) |
| `docs/briefs/README.md` | Brief template; each stage writes one brief |

## How to start a new project

1. Create a new empty GitHub repo for the project and open a Claude Code session on it.
2. Copy into it:
   - everything in this `starter-kit/` folder (including the hidden `.claude/` folder) to the repo root;
   - `Leads-for-Services-Playbook-MoveMatch.md` from the MoveMatch repo to `docs/PLAYBOOK.md`.

   Or ask Claude: "Copy the starter kit and the playbook from ezmenaged-ui/movematch into this repo."
3. Type `/kickoff painters in central Israel` (or your idea).
4. Answer stage 1 yourself (about 20 minutes: money, identity, autonomy level, spend cap).
5. Do the preflight hour (`docs/OWNER-PREFLIGHT.md`): accounts paid for, connectors, Chrome logins, documents folder. Then `/autopilot preflight`.
6. Either stay and answer each stage (`/kickoff`), or leave it running (`/autopilot`). With autopilot you come back to `docs/DIGEST-<date>.md` and a short `docs/QUESTIONS.md`. Answer it, approve the drafted briefs with `/kickoff`, and run `/autopilot` again.

Nothing is marked approved without you. Ads are built paused, payments and identity submits are prepared for you to press, and no message goes to a real person.

## How the agents talk to you

Claude Code agents can't ask you questions themselves, so the main chat does it for them: it asks the agent for the next questions, shows them to you as multiple-choice, passes your answers back, and the agent writes its brief. You can also call one agent directly, for example "ask the design agent what it needs from me".

## Where to run it
- **For console work and overnight runs:** the Claude desktop app or `claude --chrome` on your Mac, with Claude in Chrome installed and the Mac kept awake.
- **For code only:** a cloud session works. It can use your Mac's browser through Remote Control, where your account has it.

Details: playbook section 20.2.

Connector tool names in `settings.json` (`mcp__Supabase__*`, `mcp__Gmail__*`, `mcp__claude-in-chrome__*`) can differ between setups. If you still get permission prompts, run `/fewer-permission-prompts` or add the names shown in the prompt.

## Keep it learning

When something goes wrong or you add something late, tell Claude "add this to the playbook and the right agent". The playbook's section 19 and the agents' question banks should grow with every project.
