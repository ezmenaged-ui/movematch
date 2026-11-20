# Services marketplace starter kit (from MoveMatch)

A team of eight Claude Code agents, plus a gated process, for building the next lead marketplace (painters, cleaners, AC technicians...) faster than MoveMatch. On MoveMatch most of the product was discovered as we went: the original brief was one line, and funnels, video rules, access questions, abandonment emails, the test area, the kill switch, legal texts, tracking and the WhatsApp chat all came on days 3 to 12. These agents ask those questions on day 1.

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
| `.claude/commands/kickoff.md` | `/kickoff`: runs the stages in order with approval gates |
| `CLAUDE.md` | Project rules template (fill in the placeholders) |
| `docs/briefs/README.md` | Brief template; each stage writes one brief |

## How to start a new project

1. Create a new empty GitHub repo for the project and open a Claude Code session on it.
2. Copy into it:
   - everything in this `starter-kit/` folder (including the hidden `.claude/` folder) to the repo root;
   - `Leads-for-Services-Playbook-MoveMatch.md` from the MoveMatch repo to `docs/PLAYBOOK.md`.

   Or ask Claude: "Copy the starter kit and the playbook from ezmenaged-ui/movematch into this repo."
3. Type `/kickoff painters in central Israel` (or your idea).
4. Answer the questions. Each stage ends with a short summary and "Approve and move on?". Nothing is built until stages 1 to 5 are approved.

## How the agents talk to you

Claude Code agents can't ask you questions themselves, so the main chat does it for them: it asks the agent for the next questions, shows them to you as multiple-choice, passes your answers back, and the agent writes its brief. You can also call one agent directly, for example "ask the design agent what it needs from me".

## Keep it learning

When something goes wrong or you add something late, tell Claude "add this to the playbook and the right agent". The playbook's section 19 and the agents' question banks should grow with every project.
