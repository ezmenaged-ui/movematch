# Services marketplace starter kit (from MoveMatch)

A team of nine Claude Code agents, a gated process and an unattended mode, for building the next lead marketplace (painters, cleaners, AC technicians...) faster than MoveMatch. On MoveMatch most of the product was discovered as we went: the original brief was one line, and funnels, video rules, access questions, abandonment emails, the test area, the kill switch, legal texts, tracking and the WhatsApp chat all came on days 3 to 12. These agents ask those questions on day 1, and the `operator` agent does the console work (Vercel, Supabase, Twilio, Meta, GA4, Microsoft Clarity) in your logged-in Chrome instead of sending you screenshots to follow. Google Ads campaigns are built by ChatGPT from a brief the marketing agent writes, and Claude checks them.

## What's inside

In the MoveMatch repo the kit is stored **inert**: the folder is `claude/` (not `.claude/`) and the rules file is `CLAUDE.template.md`, so MoveMatch's own Claude sessions never load these agents, commands or hooks. `install.sh` copies them into a new project under their real names. The paths below are where they end up in the new project.

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
| `docs/tracker/` | The launch tracker artifact: `/kickoff` publishes it first, seeded with a 36-task launch checklist; everyone ticks tasks off as they're done |
| `docs/ads/CHATGPT-BRIEF.template.md` | The brief ChatGPT uses to build the Google Ads campaigns (Paused), with the report format Claude checks against |
| `START-HERE.md` | What to do first and the message to paste (not copied into the project) |
| `docs/autopilot/README.md` | Templates for `QUESTIONS.md`, `DECISIONS.md`, `OPS-LOG.md` and the daily digest |
| `CLAUDE.md` (stored as `CLAUDE.template.md`) | Project rules template (fill in the placeholders) |
| `install.sh` | Copies the kit into a new project (not copied itself) |
| `docs/briefs/README.md` | Brief template; each stage writes one brief |

## How to start a new project

**Shortest path:** follow `START-HERE.md`. It has the exact first message to paste into Claude.

1. Create a new empty GitHub repo for the project and open a Claude Code session on it.
2. Install the kit. Ask Claude: "Clone ezmenaged-ui/movematch to a temporary folder and run `bash starter-kit/install.sh <this repo>`, then commit." The script copies `claude/` → `.claude/`, `CLAUDE.template.md` → `CLAUDE.md`, the `docs/` files, and the playbook → `docs/PLAYBOOK.md`. It refuses to run into the MoveMatch repo or over existing files, and it changes nothing in MoveMatch.
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
